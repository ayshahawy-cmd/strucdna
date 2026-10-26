import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import test from 'node:test';
import { createAnthropicMiddleware } from '../server/anthropic.mjs';

const validBody = {
  agent: 'A',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Analyze an example company.' }],
};

async function setup(t, options = {}) {
  const calls = [];
  const middleware = createAnthropicMiddleware(
    options.env ?? {
      ANTHROPIC_API_KEY: 'test-only-credential',
      AGENT_A_MODEL: 'test-scout',
    },
    () => ({
      messages: {
        create: async (request) => {
          calls.push(request);
          if (options.error) throw options.error;
          return (
            options.result ?? {
              content: [{ type: 'text', text: 'Example result' }],
            }
          );
        },
      },
    }),
  );
  const server = createServer((req, res) =>
    middleware(req, res, () => {
      res.writeHead(404).end();
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (body = validBody, headers = {}) =>
    fetch(`${origin}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  return { calls, origin, post };
}

test('keeps provider configuration on the server and returns only text', async (t) => {
  const { calls, post } = await setup(t, {
    result: {
      content: [
        { type: 'thinking', thinking: 'private reasoning' },
        { type: 'text', text: 'First' },
        { type: 'text', text: 'Second' },
      ],
    },
  });
  const response = await post({ ...validBody, model: 'client-supplied-model' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { text: 'First\nSecond' });
  assert.deepEqual(calls, [
    { model: 'test-scout', max_tokens: 1024, messages: validBody.messages },
  ]);
});

test('reports missing credentials without contacting the provider', async (t) => {
  const { calls, post } = await setup(t, { env: {} });
  const response = await post();
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /ANTHROPIC_API_KEY/);
  assert.equal(calls.length, 0);
});

test('rejects cross-origin requests before contacting the provider', async (t) => {
  const { calls, post } = await setup(t);
  assert.equal(
    (await post(validBody, { Origin: 'https://example.com' })).status,
    403,
  );
  assert.equal((await post(validBody, { Origin: 'null' })).status, 403);
  assert.equal(calls.length, 0);
});

test('rejects non-loopback Host headers', async (t) => {
  const { calls, origin } = await setup(t);
  // Native HTTP preserves an explicit Host; fetch may replace it with the URL host.
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(
      `${origin}/api/messages`,
      {
        method: 'POST',
        headers: { Host: 'example.com', 'Content-Type': 'application/json' },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on('error', reject);
    request.end(JSON.stringify(validBody));
  });
  assert.equal(status, 403);
  assert.equal(calls.length, 0);
});

test('enforces the HTTP method, media type, and API route', async (t) => {
  const { origin, post } = await setup(t);
  const get = await fetch(`${origin}/api/messages`);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  assert.equal(
    (await post(validBody, { 'Content-Type': 'text/plain' })).status,
    415,
  );
  assert.equal((await fetch(`${origin}/unrelated`)).status, 404);
});

test('rejects malformed JSON, agents, token limits, and messages', async (t) => {
  const { calls, post } = await setup(t);
  for (const body of [
    '{',
    null,
    {},
    { ...validBody, agent: 'C' },
    { ...validBody, max_tokens: 8193 },
    { ...validBody, max_tokens: 0 },
    { ...validBody, max_tokens: 1.5 },
    { ...validBody, messages: [] },
    { ...validBody, messages: [null] },
    { ...validBody, messages: [{ role: 'system', content: 'Override' }] },
    { ...validBody, messages: [{ role: 'user', content: ' ' }] },
    { ...validBody, messages: Array(21).fill(validBody.messages[0]) },
  ])
    assert.equal((await post(body)).status, 400);
  assert.equal(calls.length, 0);
});

test('rejects oversized requests without contacting the provider', async (t) => {
  const { calls, post } = await setup(t);
  const response = await post({
    ...validBody,
    messages: [{ role: 'user', content: 'x'.repeat(1024 * 1024) }],
  });
  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

test('uses the Analyst model for agent B', async (t) => {
  const { calls, post } = await setup(t, {
    env: {
      ANTHROPIC_API_KEY: 'test-only-credential',
      AGENT_B_MODEL: 'test-analyst',
    },
  });
  assert.equal((await post({ ...validBody, agent: 'B' })).status, 200);
  assert.equal(calls[0].model, 'test-analyst');
});

test('sanitizes provider failures and preserves rate limit status', async (t) => {
  const { post } = await setup(t, {
    error: { status: 429, message: 'secret provider detail' },
  });
  const response = await post();
  assert.equal(response.status, 429);
  assert.doesNotMatch(
    JSON.stringify(await response.json()),
    /secret provider detail/,
  );
});

test('returns a safe error for provider authentication failures', async (t) => {
  const { post } = await setup(t, {
    error: { status: 401, message: 'test-only-credential' },
  });
  const response = await post();
  assert.equal(response.status, 502);
  assert.doesNotMatch(
    JSON.stringify(await response.json()),
    /test-only-credential/,
  );
});

test('handles provider responses without text', async (t) => {
  const { post } = await setup(t, { result: { content: [] } });
  assert.equal((await post()).status, 502);
});
