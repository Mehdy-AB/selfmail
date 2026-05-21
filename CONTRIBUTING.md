# Contributing

Contributions are welcome. This project follows standard GitHub flow.

## Development setup

See the [README](README.md) for full setup instructions.

## Pull requests

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes
4. Run checks: `pnpm lint && pnpm typecheck && pnpm build`
5. Commit and push, then open a pull request

## Code style

- TypeScript throughout; avoid `any`
- Prettier for formatting: `pnpm format`
- Follow existing RSC-first patterns — Server Components by default, `"use client"` only when needed
- New UI components via shadcn CLI: `pnpm dlx shadcn@latest add <component>`
