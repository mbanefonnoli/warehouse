# Spoke Route Bridge

A pnpm monorepo for matching customer names pasted from WhatsApp against a master
location list and producing Spoke-dispatch-compatible routes.

Brand color: `#1D9E75`.

## Workspace layout

- [`packages/shared`](packages/shared) — pure TypeScript normalization and fuzzy-matching
  logic shared by every app. No DOM or Node-specific dependencies.
- [`apps/web`](apps/web) — the Next.js app: paste names, import the master CSV,
  review matches, export a Spoke CSV.
- [`apps/extension`](apps/extension) — Chrome MV3 extension (React 18 + Vite + Tailwind)
  that reads names directly from WhatsApp Web.
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

## Master data format

Import a **Spoke/Circuit CSV export** — columns are auto-detected, no mapping step.

Expected columns (order-independent):

| Column | Required | Notes |
|---|---|---|
| `Company Name` | yes | Used for matching |
| `Address Line 1` | — | |
| `City` | — | |
| `State` | — | |
| `Country` | — | |
| `Notes` | — | |
| `Latitude` | — | Decimal degrees |
| `Longitude` | — | Decimal degrees |

Unrecognised columns are stored in the `extra` JSONB column (server) or ignored (web).

## Multi-location companies

When a company name maps to more than one location row (e.g. a brand with multiple
branches), the matcher surfaces **all matching locations as yellow candidates** rather
than auto-confirming one. The user selects the correct branch before export.

- Single exact match → **green** (auto-confirmed)
- Same company, multiple locations → **yellow**, `ambiguityReason: 'multi-location'`
- Fuzzy match across different companies → **yellow**, `ambiguityReason: 'fuzzy'`
- No match found → **red** (manual search required)

## Match sensitivity

Configurable via Settings → Matching:

| Level | Green threshold | Yellow floor |
|---|---|---|
| Strict | ≥ 95 % | ≥ 65 % |
| Normal (default) | ≥ 70 % | ≥ 40 % |
| Loose | ≥ 55 % | ≥ 25 % |

**Strip SRL, SA, S.C., PFA** — when enabled (default), company suffixes are folded
before comparison so "Acme SRL" matches "Acme".

## Export

- **Include all columns off** (default): exports `Company Name, Address Line 1, City`
- **Include all columns on**: exports the full Spoke/Circuit row
  (`Company Name, Address Line 1, City, State, Country, Notes, Latitude, Longitude`)

## Backend schema

### `customers` table

```sql
id           uuid        PRIMARY KEY DEFAULT gen_random_uuid()
name         text        NOT NULL
address_line1 text
city         text
state        text
country      text
notes        text
lat          real
lng          real
extra        jsonb       -- unrecognised CSV columns
```

### `settings` table

```sql
id          uuid      PRIMARY KEY DEFAULT gen_random_uuid()
updated_at  timestamp DEFAULT now()
data        jsonb     -- { matchSensitivity, stripCompanySuffixes, includeAllColumns }
```
