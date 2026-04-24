# Concert Crawl

A concert calendar for Denver that crawls venue websites daily to produce an accurate, filterable, searchable event listing.

## Monorepo Structure

```
apps/
  api/        Hono REST API (/v1/...)
  web/        Next.js App Router — UI + admin
  crawler/    Playwright + Claude Haiku extraction (Phase 3)
packages/
  db/         Drizzle ORM schema, migrations, seed
  types/      Shared TypeScript types
  config/     Shared ESLint, TypeScript, Tailwind configs
```

## Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) >= 10 (`npm install -g pnpm`)
- [OrbStack](https://orbstack.dev) or Docker Desktop

## Getting Started

```bash
# 1. Start local Postgres
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

# 4. Run migrations and seed the database
pnpm db:migrate
pnpm db:seed

# 5. Start all apps
pnpm dev
```

| Service  | URL                   |
| -------- | --------------------- |
| Web      | http://localhost:3000 |
| API      | http://localhost:3001 |
| Postgres | localhost:5433        |

## Common Commands

```bash
pnpm dev          # Start all apps in watch mode
pnpm build        # Build all apps and packages
pnpm test         # Run all tests
pnpm typecheck    # TypeScript check across all packages
pnpm lint         # ESLint across all packages
pnpm db:generate  # Generate a new migration from schema changes
pnpm db:migrate   # Apply pending migrations
pnpm db:seed      # Seed local database with Denver venues
```

## Tech Stack

| Concern  | Choice                                      |
| -------- | ------------------------------------------- |
| Monorepo | Turborepo + pnpm workspaces                 |
| API      | Hono 4                                      |
| Web      | Next.js 15 (App Router)                     |
| Auth     | Clerk                                       |
| Database | PostgreSQL 16 + Drizzle ORM                 |
| Crawler  | Playwright + Claude Haiku (LLM fallback)    |
| Styling  | Tailwind CSS + shadcn/ui                    |
| Testing  | Vitest (unit/integration), Playwright (E2E) |
| CI       | GitHub Actions                              |
| Hosting  | Render (API + Web), Render Postgres         |

## Contributing

- Branches: `feat/short-description`, `fix/short-description`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org) (enforced by commitlint)
- All CI checks must pass before merging to `main`
- Never commit `.env.local` files
