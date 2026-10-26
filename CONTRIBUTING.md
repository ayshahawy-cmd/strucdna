# Contributing to StrucDNA

Bug reports, documentation improvements, and focused pull requests are welcome.
For larger changes, open an issue to discuss the scope before implementing them.

## Development

1. Fork the repository and clone your fork.
2. Use Node.js 22.12 or later (`nvm use` selects Node 22).
3. Run `npm ci`.
4. Copy `.env.example` to `.env.local` and add your own Anthropic API key if you
   want to generate reports. An API key is unnecessary for tests, builds, and UI work.
5. Create a branch and run `npm run dev`.

The [architecture guide](docs/architecture.md) describes the source layout and
current prototype boundaries.

## Before opening a pull request

```sh
npm run format
npm run format:check
npm run check
```

Keep changes focused. Explain the user-visible behavior and how you verified it.
Include screenshots for visual changes and regression tests for substantive logic
changes. Never include API keys, `.env.local`, personal research, or generated
reports in a commit. The test suite uses a mock AI client and must not make paid
provider calls.

Contributions are distributed under the project's [MIT license](LICENSE).
Be respectful and constructive in issues and reviews. Report vulnerabilities using
the process in [SECURITY.md](SECURITY.md).
