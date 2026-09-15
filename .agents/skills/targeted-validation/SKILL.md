---
name: targeted-validation
description: Select and run the smallest meaningful TripDex test set for a changed behavior. Use when implementing, fixing, or refactoring a feature that needs validation; do not use for requests that explicitly require full-suite or release validation.
---

# Targeted Validation

Validate the changed behavior at the lowest-cost test boundary that proves it. Do not select tests by filename similarity alone.

## Procedure

1. Identify the changed files, observable behavior, and boundaries crossed.
2. Find the closest existing test coverage and inspect its runner/configuration before constructing a command.
3. Select the smallest relevant layer:
   - Pure calculation, mapper, pipe, service, or helper: targeted unit test.
   - Repository or real PostgreSQL/Prisma behavior: targeted database integration test.
   - Controller, request DTO, guard, or HTTP response contract: targeted API E2E test.
   - Vue presentation helper, composable, or UI mapping: targeted web unit test.
   - Interaction that cannot be meaningfully proved below a real browser: targeted Playwright test.
4. Add a second layer only when the change crosses that boundary. For example, a service business rule plus an HTTP contract needs the relevant service unit test and HTTP test; it does not automatically need Playwright.
5. When behavior lacks coverage, add the smallest deterministic regression test at its observable boundary. Prefer Arrange / Act / Assert and avoid private-implementation tests or excessive mocking.

## TripDex Test Targets

- API unit tests use Jest for `apps/api/src/**/*.spec.ts`. From the repository root, target one file with `npm run test --workspace=api -- --runInBand src/<area>/<target>.spec.ts`.
- API HTTP/E2E tests use Jest with `apps/api/test/jest-e2e.json` and `*.e2e-spec.ts`. Target one file with `npm run test:e2e --workspace=api -- test/<target>.e2e-spec.ts`.
- API database integration tests use Node's test runner. Inspect the available API `test:db:*` scripts and integration test files, then select the smallest relevant target; `test:db:users`, `test:db:community`, and `test:storage` are current examples. Other DB integration files require the scoped API build setup used by those scripts; inspect the test before invoking it directly.
- Web unit tests use Node's test runner over `apps/web/test/unit/*.test.mjs`. To target one file, run `node --test test/unit/<target>.test.mjs` from `apps/web`.
- Web browser tests use Playwright. Target a default browser spec with `npm run test:e2e --workspace=web -- test/<target>.spec.ts`; use `test:passport` or `test:community` only when their corresponding configuration is relevant.

Do not run every test in a category merely because several changed files participate in one behavior. Validate that behavior with the smallest coherent set.

## Failure Handling

1. Decide whether a failure is caused by the current change.
2. Inspect the relevant implementation and test.
3. Fix only the relevant issue when appropriate.
4. Rerun the smallest failed target.
5. Once fixed, rerun the final selected set.

Do not weaken assertions, blindly update snapshots, broaden scope to unrelated failures, or silently ignore a relevant failure. Report evidence when a failure is clearly pre-existing or unrelated.

## Boundaries

Do not routinely run the full repository suite, global build, global lint, global formatting, global typecheck, Prisma verification, or Playwright when a lower layer proves the behavior. Use them only when explicitly requested or when a concrete technical reason prevents targeted validation.

Do not create tests solely to increase coverage metrics. Do not include Git operations in this workflow.

## Report

Return a short factual summary:

```text
Targeted Validation

- Changed behavior: <summary>
- Unit: PASS / N/A
- Integration: PASS / N/A
- HTTP/E2E: PASS / N/A
- Browser: PASS / N/A
- Relevant failures: NONE / <summary>
- Verdict: PASS / BLOCKED
```

Include counts only when the runner provides them reliably.
