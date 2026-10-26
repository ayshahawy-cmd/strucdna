# Security policy

## Reporting a vulnerability

Please use the repository's [private vulnerability reporting form](https://github.com/ayshahawy-cmd/strucdna/security/advisories/new).
Include reproduction steps, affected versions or commits, and the likely impact.
Do not publish API keys or personal data in an issue or pull request.

Security fixes target the latest code on `main`. Older snapshots do not have a
separate maintenance policy. There is no guaranteed response time.

## Local development boundary

StrucDNA is a single-user prototype. Its API middleware is limited to loopback
hosts and same-origin browser requests. It runs inside the Vite development or
preview server; `dist/` alone does not provide an API.

- Store `ANTHROPIC_API_KEY` only in your local environment or `.env.local`.
- Never use a `VITE_` prefix for credentials; Vite exposes those values to clients.
- The server keeps the provider credential out of browser code and applies body
  and output-token limits. It does not provide authentication or per-user quotas.
- Reports and thesis notes are stored in browser `localStorage` without encryption.
  People and scripts with access to the same browser profile can read that data.
- Prompts, company evidence bundles, follow-up questions, and thesis context are
  sent to Anthropic when you use AI features.

For a public hosted application, implement a production backend with authentication,
authorization, rate limits, spending controls, and appropriate storage before
allowing other users to access the AI endpoint. Do not expose Vite dev or preview
as a public service.
