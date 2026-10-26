# StrucDNA

[![CI](https://github.com/ayshahawy-cmd/strucdna/actions/workflows/ci.yml/badge.svg)](https://github.com/ayshahawy-cmd/strucdna/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An open source workspace for AI-assisted company research and investment thesis
journaling. Explore a company, examine structural risks, and record the conditions
that would change your thesis.

**Status: early prototype.** Reports currently use model knowledge, without live
SEC filing retrieval or verified citations. Accounts and billing are mocked. This
is a tool for experimentation and education; generated reports are not financial
advice or verified investment research.

## Features

- Scout/Analyst workflow for structured evidence bundles and reports.
- Report views for risks, competitive moats, management, and checklists.
- Follow-up questions and moat stress tests using the report context.
- Thesis locks with accepted risks and explicit exit conditions.
- Local report history, a 24-hour report cache, and thesis snapshots.
- Local thesis checks and a share-card UI for exploring future workflows.

## Quick start

You need Node.js **22.12 or later**, npm, and an
[Anthropic API key](https://console.anthropic.com/) to generate reports. UI work,
tests, and builds work without a key. AI requests consume your provider credits.

```sh
git clone https://github.com/ayshahawy-cmd/strucdna.git
cd strucdna
npm ci
cp .env.example .env.local
```

Add your own key to `.env.local`:

```dotenv
ANTHROPIC_API_KEY=your_api_key_here
```

Then start the app:

```sh
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Keep the key in `.env.local`;
it is ignored by Git and read only by the local Node middleware. Restart the
server after changing environment values.

The default model for both agents is `claude-sonnet-5-5`. Override
`AGENT_A_MODEL` (Scout) or `AGENT_B_MODEL` (Analyst) in `.env.local` if needed.
Check [Anthropic's model documentation](https://platform.claude.com/docs/en/models/overview)
for available IDs and access requirements.

## Development commands

| Command                | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Local UI and API at port 3000                   |
| `npm run typecheck`    | Strict TypeScript checks                        |
| `npm test`             | API regression tests with a mock AI provider    |
| `npm run build`        | Compile the browser application into `dist/`    |
| `npm run preview`      | Preview the build and local API at port 4173    |
| `npm run check`        | Typecheck, tests, and production build          |
| `npm run format`       | Format source, configuration, and documentation |
| `npm run format:check` | Check formatting without changes                |

CI runs formatting, type checks, tests, and builds on Node 22 and 24. No provider
credentials or paid AI calls are required by CI.

## Project structure

```text
src/          React pages, components, services, prompts, types, and styles
server/       Local Node middleware for Anthropic requests
tests/        HTTP tests with a mock provider
docs/         Architecture and implementation boundaries
.github/      CI, dependency updates, issue forms, and PR template
```

See [Architecture](docs/architecture.md) for the data flow and current limitations.

## Data and prototype limits

Reports and thesis notes live in this browser's `localStorage`. Clearing site data
removes them. There is no cloud account, backup, or cross-device synchronization.
A share link only resolves in the browser that already contains the report; it
does not publish or transfer the report.

Pulse checks run while the app is open, rather than as scheduled monitoring. A due
locked thesis may trigger AI requests after startup when an API key is configured.
Prompts, evidence bundles, follow-up questions, and thesis context are sent to
Anthropic for generation. Billing buttons and Pro status are demo placeholders.

The app is set up for **local, single-user use**. Vite dev/preview provides the
local API; a static `dist/` deployment alone cannot generate reports. A public
service needs a production backend, authentication, rate limits, spending controls,
and persistent storage. See the [security policy](SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and pull request checks.
[Open an issue](https://github.com/ayshahawy-cmd/strucdna/issues) for a bug or proposal.
Please report vulnerabilities through
[private security reporting](https://github.com/ayshahawy-cmd/strucdna/security/advisories/new).

## License

[MIT](LICENSE) — Copyright (c) 2026 Ahmed Elshahawi.
Third-party dependencies retain their respective licenses. The npm package is
marked private to prevent accidental registry publishing; the source is open source.
