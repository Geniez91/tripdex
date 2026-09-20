# TripDex Agent Guide

## Product

TripDex is a social travel journal focused on real travel history, exploration, community discovery, and game-like progression.

Product idea:

"Letterboxd for travel, with the progression of a game."

Tagline:

"Explore. Log. Complete."

### Core Travel Journal

A Trip represents a real travel event and is a primary source of truth.

- Preserve separate Trips so revisits remain meaningful.
- A user may visit the same country in multiple Trips.
- A Trip may contain multiple countries.
- PUBLIC and PRIVATE Trips both belong to the owner's travel history.
- Residence is separate from travel and never counts as a visit by itself.
- Do not infer travel, visits, or experiences from profile information alone.

### Personal Exploration

TripDex derives personal exploration from actual travel history.

Current concepts include:

- personal world map;
- unique countries visited;
- world completion;
- continents explored;
- continent progression;
- country revisits;
- cumulative travel days;
- travel progression over time.

Progression must come from real, provable TripDex facts.

Do not introduce arbitrary XP, levels, points, or fake progression.

### Achievements

TripDex uses achievements/badges derived from provable domain facts.

Current achievement concepts include:

- Trips;
- countries explored;
- continents explored;
- revisits;
- cumulative travel time;
- community participation;
- photo contest wins.

Locked achievements may show direct progress toward their real criterion.

Community rarity describes how common an achievement is among eligible TripDex travelers; it is not progression currency.

### Community

TripDex community features derive from real travel-domain activity.

TripDex does not use a generic free-form social post wall.

Prefer domain activity such as Trips, exploration, contest participation, and travel memories over arbitrary user posts.

Current community concepts include:

- community travel statistics;
- community world map;
- travel activity feed;
- country explorer;
- weekly travel photo contests;
- community photo memories.

### Product Integrity

When implementing or refactoring features:

- preserve historical travel facts;
- preserve separate Trips and revisits;
- preserve multi-country Trips;
- distinguish residence from travel;
- preserve owner access to both PUBLIC and PRIVATE travel history;
- respect privacy boundaries when exposing community data;
- derive statistics and progression from authoritative domain data;
- do not fabricate accomplishments or infer experiences TripDex cannot prove;
- do not turn TripDex into a generic social network.

## Current vs Future Product

Treat the capabilities described above as current product concepts, but verify the repository before assuming a particular implementation or API exists.

Future product directions may include:

- country and local exploration;
- cities, places, and activities;
- travel expenses and budgets;
- destination discovery and recommendations;
- trip planning;
- friends and social maps.

These are product directions, not implemented architecture.

Do not invent their models, APIs, persistence, or provider integrations before the relevant task defines them and the repository has been inspected.

## Repository

- Work in the npm-workspaces monorepo: `apps/web` is Nuxt 4, Vue, TypeScript, and Vuetify; `apps/api` is NestJS and Prisma.
- Supabase provides PostgreSQL, Auth, and Storage infrastructure; application
  business logic remains behind the appropriate TripDex backend boundaries.

## Backend Architecture

Use the default dependency direction: HTTP -> Controller -> Request DTO -> Service -> Repository -> Prisma/PostgreSQL.

- Keep controllers thin and put business rules in services or domain logic.
- Keep persistence concerns out of HTTP contracts; never expose Prisma models as HTTP contracts.
- Prefer pure, deterministic helpers for calculations and mappings.
- Introduce repositories only when they provide a meaningful persistence boundary.
- Do not add abstractions only to satisfy a pattern.

## Backend Error Handling and Observability

Use NestJS HTTP exceptions that match the established API contract: 400 for malformed or invalid domain input, 401 for missing or invalid authentication, 403 for insufficient permission, 404 for unavailable scoped resources, 409 for identifiable state or concurrency conflicts, and 422 for established semantically unprocessable metadata or domain input. Use 503 only for a concretely identifiable dependency or infrastructure availability failure.

- Prefer direct NestJS `HttpException` subclasses. Keep client messages simple and safe; do not expose database, storage, or other internal details.
- Preserve established domain-local machine-readable contracts, such as auth provisioning `{ code, message }`; do not introduce a global error-code system or custom exception wrappers without a concrete need.
- Unexpected technical failures that cannot be meaningfully classified must propagate to `GlobalExceptionFilter`, which owns safe HTTP 500 handling and unexpected-error logging.
- Catch locally only for recovery, compensation, reconciliation, cleanup, known technical-failure translation, or intentional fallback/suppression. Do not catch merely to log and rethrow, mechanically preserve an exception, or translate every unknown failure to 503 or another generic 500.
- Expected 4xx outcomes are not automatically technical error logs. Avoid duplicate local error logs for failures that simply reach the global boundary; log locally only when recovery, compensation, reconciliation, suppression, or retry adds unique operational context.

Backend runtime logger contexts are centralized in `apps/api/src/logger.constants.ts`. Reuse an existing context constant, add a new constant there for a new logger-owning runtime component, and never redeclare context strings locally. Keep context constants separate from log messages and unrelated constants.

- Use `logger.log` for meaningful successful state changes or operational events, not routine reads, repository calls, or method entry/exit.
- Use `logger.error` for meaningful technical failures, especially when the current layer performs recovery, compensation, or reconciliation.
- Logs must not include tokens, credentials, authorization headers, cookies, passwords/secrets, signed URLs, request bodies, upload contents, arbitrary serialized request objects, or unnecessary storage paths and user/trip/contest identifiers. Prefer event-oriented messages.
- Normal HTTP execution timing belongs only in the global request-timing interceptor. Do not manually time ordinary controller or service methods; timing logs use method, query-free path, resolved status, and duration, and do not replace exception diagnostics from `GlobalExceptionFilter`.

## Frontend Architecture

- Keep business API calls in `apps/web/app/services/api`; do not fetch business APIs directly in views when a service belongs there.
- Separate API models from UI/presentation concerns when useful.
- Prefer composables for reusable state or orchestration when appropriate.
- Reuse existing frontend patterns before adding abstractions.
- Do not access Supabase directly from frontend business features when the Nest API owns that business logic.

## Clean Code

- Optimize for readability, not abstraction count. Use explicit domain names and keep orchestration readable.
- Give functions one clear responsibility when practical; extract helpers only when they clarify meaningful phases or remove duplication.
- Avoid deep nesting when early returns or decomposition clarify the code.
- Search for an existing pattern before creating a new one. Avoid unnecessary factories, strategies, wrappers, or classes.
- Avoid `any`, `as any`, unsafe double assertions, and TypeScript suppressions unless an unavoidable reason is documented.
- Do not split cohesive logic into trivial one-line helpers merely to shorten functions.
- Keep implementation files focused on their role: services orchestrate behavior, controllers adapt HTTP, pipes validate/transform, and repositories own persistence. Put exported or reusable domain contracts in grouped, domain-appropriate type modules; keep meaningful deterministic standalone transformations, comparators, normalizers, and calculations in focused helper modules rather than generic `utils.ts` files.
- Meaningful exported project-owned interfaces, type aliases, and enums do not normally belong in executable implementation modules (including services, repositories, controllers, pipes, helpers, rules, calculations, and mappers). Own them in focused type, DTO, or persistence-type modules and import them into implementation modules. A non-exported, trivial implementation-only declaration may remain local when it has no standalone domain significance and moving it would only add navigation.
- Keep role-specific orchestration as private methods when clearer. Pure code does not automatically require extraction; do not extract trivial helpers or create one file per type merely for file length.
- Keep type-focused modules primarily for project-owned interfaces, type aliases, and domain enums. Keep meaningful deterministic calculations, mappings, comparisons, normalization, parsing, and predicates in focused helper, rule, or calculation modules that import their contracts; do not force runtime constants into type modules solely because a type is derived from them.
- Services own dependency-driven orchestration, repositories own persistence behavior and may retain persistence-specific row/result contracts, and DTO modules own HTTP contracts. Move meaningful application/domain contracts out of implementation modules, but retain trivial local implementation details where moving them would reduce readability.
- Separate modules by responsibility, not declaration count: group strongly related contracts or deterministic operations together, and do not create one file per interface, type, enum, or function.
- Contract separation keeps meaningful contracts out of implementation behavior; it does not require one contract file per interface, service, or implementation concern. Group strongly related interfaces, type aliases, and enums in a focused domain or subdomain contract module, based on the concept they describe rather than the service that consumes them. Consolidate tiny modules only when it materially improves discovery within the same cohesive concept; keep separate DTO/API, internal domain, and persistence-specific row/result modules when those layers or concepts are distinct. Do not replace fragmentation with giant catch-all type files, and leave generated or external contracts untouched.
- Group all static imports at the top of a module, before constants, local types, functions, classes, and other implementation declarations. Do not place static imports between or after declarations; no additional import-sorting rule is required.
- Prefix project-owned interfaces with `I`, type aliases with `T`, and enums with `E`, according to their actual declaration kind. Exclude generated and external declarations; ordinary feature work must not trigger unrelated repository-wide renaming.
- Prefer `property?: T` when a property is genuinely omittable. Use `property: T | null` when it is structurally present but explicitly nullable, including SQL, Prisma, and LEFT JOIN representations. Preserve established API null semantics, and use `property?: T | null` only when absence, null, and a value are intentionally distinct.
- In DTO, type, and contract modules, name a nested object shape when it is reused, represents a recognizable domain or API concept, materially clarifies its parent, or needs to be referenced by another contract. Keep strongly related contracts grouped in the same focused module. Do not extract every inline object: trivial incidental one-off shapes may remain inline when a name only adds navigation. Reuse a named contract only when its domain semantics are genuinely the same; structural similarity alone does not justify coupling unrelated features.
- One function or method should have one clear responsibility at its current abstraction level. Multiple coherent steps may remain together in an orchestration method; do not split functions merely because they are long. Extract when distinct responsibilities harm clarity, ownership, or testability, and avoid trivial wrapper methods. Optimize for readability and responsibility boundaries rather than line count.
- An orchestration function may coordinate sequential steps that form one operation, but should not embed substantial independent domain calculations that can be named and isolated clearly. Extract meaningful calculations when this improves readability, ownership, or focused testability; do not extract trivial property access, a single obvious expression, wrappers around an existing helper, or code solely to reduce line count.
- Choose calculation ownership by semantics, not TypeScript line count or maximum SQL usage. Prefer PostgreSQL behind repositories for data-intensive relational and aggregate work (filtering, joins, COUNT/DISTINCT, SUM, MIN/MAX, GROUP BY, existence checks, data-set reduction, and appropriate CTE/window calculations) when it reduces data transfer or application-memory grouping while remaining understandable and testable. Keep domain policy and rules in deterministic application code when they are clearer, reusable, or naturally operate on an existing domain snapshot; keep orchestration and DTO assembly in application code. Before extracting a substantial TypeScript calculation, consider whether it belongs in the repository, but do not move it to SQL merely because SQL can express it. Use coherent query plans rather than many small queries or N+1 access, and preserve one authoritative definition when equivalent progression facts are needed in SQL and domain code.
- Avoid unrelated refactors.

## Change Scope

- Make the smallest coherent change that satisfies the task.
- Preserve behavior during refactors unless a behavior change is explicitly requested.
- Report an unexpected architectural issue that materially changes the task instead of silently expanding scope.

## Testing

- Default to targeted validation: run only relevant unit and integration/E2E tests for the changed feature.
- Do not routinely run full repository suites, global builds, global lint, global formatting, or global typechecks.
- If a targeted test fails, diagnose and fix only the relevant issue, then rerun it. Do not weaken tests to make them pass.
- Keep test-specific variables, scenario-defining values, assertions, thresholds, and behavior-specific mocks local to their spec. Put genuinely reusable domain test data or constants in focused domain `*.fixtures.ts` modules; fixture modules own data, not test behavior, and must not become generic dumping grounds.
- Avoid shared mutable fixture instances. Use a small, strongly typed fresh fixture factory only when mutation or configuration requires isolation; otherwise use immutable reusable data. Use real project contracts where appropriate, without `any`, unsafe assertions, or TypeScript suppressions merely to simplify fixture setup.
- Do not extract test values solely to shorten setup: reusable domain data belongs in focused fixture modules, while scenario-defining values and assertions remain local for readability.

## Prisma

- TripDex uses the Prisma 8 contract workflow in `apps/api`.
- Do not use legacy `prisma migrate dev`.
- Never edit generated `contract.json` or `contract.d.ts` by hand.
- Do not rerun database initialization against an existing TripDex database unless the task explicitly requires initialization.
- For schema/database work, inspect the repository's current Prisma workflow before executing database operations.

## Git

- Follow Gitflow: `master` is stable and `develop` is the integration branch.
- Use appropriately scoped work branches such as `feature/*`, `refactor/*`, or `chore/*`.
- Use Conventional Commits.
- Never use `git add .` or `git add -A`; stage files explicitly.
- Before committing, inspect the staged diff.
- Do not push, merge, delete branches, rewrite history, force-push, discard, restore, stash, or overwrite pre-existing user changes unless explicitly requested.

## Agent Behavior

- Inspect relevant code and prefer repository evidence over assumptions.
- Reuse appropriate existing patterns.
- Follow explicit task-specific instructions over general workflow guidance
  when they conflict, while preserving product integrity and user data.
- Stop only when missing information materially changes the correct implementation or proceeding could destroy user work; otherwise make reasonable local decisions and continue.
- Keep final reports concise and factual.
