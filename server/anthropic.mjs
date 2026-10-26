import Anthropic from '@anthropic-ai/sdk';

const BODY_LIMIT = 1024 * 1024;
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

/** Local-only API for Vite dev and preview. Tests substitute a mock client. */
export function createAnthropicMiddleware(
  env,
  createClient = (apiKey) =>
    new Anthropic({ apiKey, timeout: 120_000, maxRetries: 0 }),
) {
  let client;

  return async (request, response, next) => {
    if (request.url?.split('?')[0] !== '/api/messages') return next();

    // Check Host and Origin to resist DNS rebinding and cross-site calls.
    const host = request.headers.host;
    try {
      const hostUrl = new URL(`http://${host}`);
      if (!LOCAL_HOSTS.has(hostUrl.hostname)) throw new Error('Non-local host');
      const origin = request.headers.origin;
      if (origin && origin !== hostUrl.origin)
        throw new Error('Cross-origin request');
    } catch {
      return sendJson(response, 403, {
        error: 'This API accepts local, same-origin requests only.',
      });
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, { error: 'Use POST for this endpoint.' });
    }
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return sendJson(response, 415, {
        error: 'Content-Type must be application/json.',
      });
    }

    let body;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > BODY_LIMIT) {
          return sendJson(response, 413, {
            error: 'Request exceeds the 1 MiB limit.',
          });
        }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return sendJson(response, 400, {
        error: 'Request body must be valid JSON.',
      });
    }

    if (
      !body ||
      !['A', 'B'].includes(body.agent) ||
      !Number.isInteger(body.max_tokens) ||
      body.max_tokens < 1 ||
      body.max_tokens > 8192 ||
      !Array.isArray(body.messages) ||
      body.messages.length < 1 ||
      body.messages.length > 20 ||
      !body.messages.every(
        (message) =>
          message &&
          ['user', 'assistant'].includes(message.role) &&
          typeof message.content === 'string' &&
          message.content.trim().length > 0,
      )
    ) {
      return sendJson(response, 400, {
        error: 'Invalid agent, token limit, or messages.',
      });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return sendJson(response, 503, {
        error:
          'Set ANTHROPIC_API_KEY in .env.local and restart the development or preview server.',
      });
    }

    try {
      client ??= createClient(env.ANTHROPIC_API_KEY);
      const result = await client.messages.create({
        model: env[`AGENT_${body.agent}_MODEL`] || DEFAULT_MODEL,
        max_tokens: body.max_tokens,
        messages: body.messages.map(({ role, content }) => ({ role, content })),
      });
      const text = result.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
      if (!text)
        return sendJson(response, 502, {
          error: 'The AI provider returned no text.',
        });
      return sendJson(response, 200, { text });
    } catch (error) {
      // Provider errors may include request metadata; do not expose them.
      const rateLimited = error?.status === 429;
      return sendJson(response, rateLimited ? 429 : 502, {
        error: rateLimited
          ? 'AI provider rate limit reached. Please try again later.'
          : 'AI request failed. Check the server API key, model access, and provider availability.',
      });
    }
  };
}
