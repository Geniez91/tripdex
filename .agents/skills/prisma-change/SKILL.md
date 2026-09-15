---
name: prisma-change
description: Safely perform TripDex Prisma 8 contract, schema, and database changes. Use when a task changes persistence structure, regenerates the Prisma contract, initializes a database, or updates database schema; do not use for application-only code that merely reads through existing Prisma repositories.
---

# Prisma Changes

Use the TripDex Prisma 8 contract workflow from `apps/api`. Begin by classifying the task; do not run a standard sequence for every Prisma-related request.

## Classify First

Choose one category before executing Prisma commands:

- **A. Contract/schema inspection only:** inspect `apps/api/src/prisma/contract.prisma`, `prisma.config.ts`, generated artifacts, and migrations. Do not mutate the contract or database.
- **B. Generated contract refresh:** the contract source changed and only emitted artifacts need regeneration.
- **C. New database initialization:** an explicitly new, empty database requires its first contract application.
- **D. Existing database schema update/migration:** an existing database must change to match an intended contract change.
- **E. Database verification:** confirm consistency or diagnose suspected drift without changing the schema.
- **F. Application-only change:** no persistence structure changes; do not run Prisma commands.

## Repository Facts

- Contract source: `apps/api/src/prisma/contract.prisma`.
- Generated, versioned artifacts: `apps/api/src/prisma/contract.json` and `apps/api/src/prisma/contract.d.ts`.
- Configuration: `apps/api/prisma.config.ts`; package scripts expose `contract:emit` and `db:verify`.
- Versioned migration packages and refs live in `apps/api/migrations/app` and `apps/api/migrations/snapshots`.

Never edit generated contract artifacts by hand. Never use legacy `prisma migrate dev`.

## Procedures

### B. Generated Contract Refresh

1. Inspect the source-contract change.
2. From `apps/api`, run `npx prisma contract emit`.
3. Inspect the generated `contract.json` and `contract.d.ts` diff. Keep it only when it corresponds to the intended source change.

Do not emit artifacts when the task does not affect the contract source.

### C. New Database Initialization

Use this path only when initialization of a new database is explicitly required.

1. Emit the current contract if its source changed.
2. Run `npx prisma db init --dry-run` and inspect the proposed impact.
3. Run `npx prisma db init` only after the preview matches the intended new database.
4. Run `npx prisma db verify` when verification is required.

Never treat normal feature work against an existing TripDex database as initialization.

### D. Existing Database Schema Update/Migration

1. Inspect the current contract, migration history, target database, and whether it is isolated local development or shared/reviewable.
2. Make the minimal source-contract change, then run `npx prisma contract emit` and inspect generated artifact diffs.
3. For an isolated local development database, preview with `npx prisma db update --dry-run`. Inspect every structural or destructive operation and stop on unexpected impact.
4. Apply the reviewed local update with `npx prisma db update`; `npx prisma db update -y` is supported only after the impact has been reviewed and non-interactive confirmation is appropriate.
5. Do not use `db update` for shared or production-like databases: it writes no migration history. Follow the installed Prisma 8 migration guidance to produce and review the versioned migration workflow in `migrations/app` before applying it.
6. Use `npx prisma db verify` for explicit verification or drift diagnosis. A successful `db update` already verifies the schema, so do not run verification mechanically.
7. When application behavior changed, invoke `targeted-validation` for the relevant focused tests.

## Safety Stops

- Never initialize an existing TripDex database as routine validation.
- Never reset, drop, or recreate a production-like or user database to make a task pass.
- Inspect the generated and database diffs before applying structural or destructive operations.
- Stop and report if a preview or command indicates unexpected destructive impact, drift, or an unclear target database.
- Do not invent recovery procedures. Inspect the installed Prisma 8 guidance and the specific migration state before proceeding.

## Report

Return a concise factual summary:

```text
Prisma Change

- Task classification: <A-F / description>
- Contract regeneration: DONE / N/A
- Database initialization: DONE / N/A
- Database update: DONE / N/A
- Database verification: PASS / N/A
- Generated artifacts inspected: PASS / N/A
- Targeted validation: PASS / N/A
- Unexpected destructive impact: NONE / <summary>
- Verdict: PASS / BLOCKED
```
