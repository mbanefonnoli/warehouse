# Spoke Route Bridge

A pnpm monorepo for matching customer names pasted from WhatsApp against a master
customer list and producing Spoke-dispatch-compatible routes.

Brand color: `#1D9E75`.

## Workspace layout

- [`packages/shared`](packages/shared) — pure TypeScript normalization and fuzzy-matching
  logic shared by every app. No DOM or Node-specific dependencies.
- [`apps/web`](apps/web) — the original Next.js app: paste names, upload the master
  Excel list, review matches, export a Spoke CSV.
- [`apps/extension`](apps/extension) — Chrome MV3 extension (React 18 + Vite + Tailwind)
  that will read names directly from WhatsApp Web.
- [`apps/server`](apps/server) — Fastify + Drizzle + Postgres backend that syncs match
  results and route state across devices.

## Conventions

- TypeScript everywhere, `strict` mode, no `any`.
- Runtime input is validated with Zod (or TypeBox where Zod doesn't fit).
- Tests use Vitest.
- Lint with ESLint (flat config), format with Prettier.

## Getting started

```bash
pnpm install
pnpm -r build
pnpm -r test
```

Each app also exposes its own `dev` script, e.g. `pnpm --filter @spoke/web dev`.
