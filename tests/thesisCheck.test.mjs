import assert from 'node:assert/strict';
import test from 'node:test';
import { parseThesisCheck } from '../src/services/thesisCheck.mjs';

test('reads an explicit thesis status and a multiline summary', () => {
  assert.deepEqual(
    parseThesisCheck(
      '<!-- THESIS_CHECK\nstatus: WATCH\nsummary: [First signal.\nSecond signal.]\n-->',
    ),
    {
      status: 'WATCH',
      summary: 'First signal.\nSecond signal.',
    },
  );
});

test('handles plain summaries and case-insensitive statuses', () => {
  for (const status of ['holding', 'watch', 'broken']) {
    assert.deepEqual(
      parseThesisCheck(
        `<!--THESIS_CHECK\nstatus: ${status}\nsummary: Review original sources.\n-->`,
      ),
      {
        status: status.toUpperCase(),
        summary: 'Review original sources.',
      },
    );
  }
});

test('rejects absent, invalid, and partial statuses instead of assuming HOLDING', () => {
  for (const markdown of [
    'No machine-readable assessment.',
    '<!-- THESIS_CHECK\nsummary: No status.\n-->',
    '<!-- THESIS_CHECK\nstatus: UNKNOWN\n-->',
    '<!-- THESIS_CHECK\nstatus: HOLDING_BUT_UNSURE\n-->',
  ])
    assert.throws(() => parseThesisCheck(markdown), /no status|invalid status/);
});
