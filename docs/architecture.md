# Architecture

StrucDNA is a React application with hash-based routing, a local Node API, and
browser storage. It is a research prototype rather than a hosted multi-user service.

## Layout

```text
src/
  App.tsx              Routes and startup behavior
  main.tsx             React entry point
  index.css            Tailwind directives and global styles
  components/          Search, report views, follow-up chat, thesis lock
  pages/               Home, reports, history, journal, settings, share card
  services/
    aiService.ts       Scout/Analyst prompts, API requests, response parsing
    dbService.ts       localStorage persistence and account/billing stubs
    pulseService.ts    Thesis checks while the app is open
    thesisCheck.mjs    Explicit status parsing for thesis checks
  constants.ts         Scout and Analyst prompt templates
  types.ts             Report, evidence, score, and thesis types
server/
  anthropic.mjs        Local-only API middleware; provider credentials stay here
tests/
  *.test.mjs           API and thesis-status regression tests
```

## Research flow

1. A ticker opens the report page. A report cached for the demo user for 24 hours
   is reused when available.
2. Scout requests a JSON evidence bundle through `POST /api/messages` (agent `A`).
   The prototype explicitly uses model knowledge; it has no retrieval tools.
3. Analyst receives the bundle and produces a report (agent `B`). Its score block
   is parsed separately from the displayed Markdown.
4. Reports, thesis locks, backtests, stress tests, and snapshots are saved in
   `localStorage`. Follow-up questions reuse the evidence bundle.

The middleware selects models from server environment variables. It accepts
text messages for agents `A` and `B`, limits request bodies to 1 MiB and requested
output to 8,192 tokens, rejects cross-origin/non-loopback calls, and returns only
provider text or a sanitized error. Both Vite dev and preview register it.

Tailwind v3 preserves the prototype's existing utilities. The npm override for
`postcss-selector-parser` selects its patched v7 release to address
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) in the
Tailwind/PostCSS dependency tree. Recheck the override when upgrading Tailwind.

## Current limitations

- The Scout prompt describes a future filing retrieval workflow; the implementation
  has no search or SEC integration. Generated sources and numbers are unverified.
- Accounts, Pro subscriptions, billing links, and some track-record metrics are
  mocked in `dbService.ts`. There is no payment processing or authentication.
- A share token resolves against local browser storage. A copied link does not
  transfer report data to another browser or device.
- Pulse checks run after app startup for the demo paid user, using a 24-hour
  eligibility threshold. They are not a scheduled background service. Due checks
  can make paid API calls when a key and locked theses are present.
- AI output is only partially validated. Missing or invalid thesis-check status
  leaves the previous status unchanged; it must never imply a successful check.
- Browser storage has no synchronization, encryption, or server backup.

## Next development areas

Real filing retrieval and citation verification, runtime response schemas,
authenticated persistence and sharing, background jobs, and accessible/responsive
UI improvements are useful areas for contributions. Discuss the design in an
issue before a large change.
