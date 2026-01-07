# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed via npm workspaces. Core services live in `packages/api` (NestJS backend) and `packages/web` (Next.js frontend). Generated assets and shared types are committed inside each package.
- Backend source sits in `packages/api/src`, Prisma schema and migrations in `packages/api/prisma`, and job/SDK helpers under `packages/api/scripts`. Keep migrations and code changes in the same pull request.
- Frontend React components, hooks, and Zustand stores reside in `packages/web/src`; static assets and Tailwind config live in `packages/web/public` and `packages/web/tailwind.config.ts`. Architecture diagrams and specs live under `docs/`.

## Build, Test, and Development Commands
- `./run.sh`: boots both API (port 3000) and web (port 3001) with OpenAPI-driven SDK generation.
- `npm run dev --workspace @memorang/api`: watch-mode Nest server backed by local PostgreSQL/Redis.
- `npm run dev --workspace @memorang/web`: Next.js dev server with hot reload.
- `npm run build --workspace <pkg>`: production build for the selected package.
- `npm run start:studio`: opens Prisma Studio against `packages/api/prisma/schema.prisma` for debugging data.
- `npm run codegen --workspace @memorang/web`: regenerates the typed REST client from the API’s OpenAPI spec.

## Coding Style & Naming Conventions
- TypeScript everywhere; rely on Prettier defaults (2-space indent, single quotes) via `npm run format --workspace <pkg>`.
- Keep files scoped by feature (e.g., `flashcards.controller.ts`, `useFlashcardsStore.ts`). Classes, enums, and DTOs use PascalCase; functions, hooks, and variables use camelCase; constants are SCREAMING_SNAKE.
- Follow NestJS layering (controller → service → repository) and Next.js app router conventions. Avoid exporting default anonymous functions; prefer named exports for clarity.

## Testing Guidelines
- Backend tests use Jest; co-locate unit specs as `*.spec.ts` and integration specs as `*.integration.spec.ts` under `packages/api/test` or inside feature folders.
- Run `npm run test --workspace @memorang/api` before every PR, and add `npm run test:cov --workspace @memorang/api` for CI parity. Target ≥80% statements for new modules and cover queue handlers plus Prisma workflows.
- Frontend relies on manual QA today; add Playwright or React Testing Library suites under `packages/web/src/__tests__` when you touch UI-critical flows.

## Commit & Pull Request Guidelines
- Follow the existing Git history: short, imperative, lower-case subjects (e.g., `fix buckets`). Reference ticket IDs when available (`fix auth refresh #123`).
- Each PR should include: summary, testing evidence (commands run), screenshots/video for UI changes, and callouts for schema/env updates. Link related design docs in `docs/` and update OpenAPI + regenerated clients when the API surface changes.

## Security & Configuration Tips
- Secrets live in `.env`, `packages/api/.env`, or GCP Secret Manager; never commit them. Use the helper scripts (`create-secrets.sh`, `setup-redis-secrets.sh`) for provisioning.
- When touching GCS or Vertex AI configs, keep the JSON templates (`configure-gcs-cors.sh`, `cors.json`, `gcs-cors.json`) in sync and document required IAM roles in your PR description.
