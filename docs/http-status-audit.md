# TripDex HTTP status audit

Scope: all 10 registered controllers, 13 declared endpoints in apps/api/src. No global route prefix, custom response status filter, or manual response writer was found. Routes below exclude automatically provided HEAD/CORS handling.

No success status changes are required. Explicit decorators now document every success status, including the representation-returning 200 responses. No bodyless endpoint exists. Nest defaults are 200 except POST (201): https://docs.nestjs.com/controllers#status-code

| Method | Route                 | Controller.method               | Current | Expected | Declaration | Errors already handled                                                                                                          | Success HTTP test       |
| ------ | --------------------- | ------------------------------- | ------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| GET    | /                     | AppController.getHello          | 200     | 200      | Explicit    | No specific business errors                                                                                                     | app.e2e-spec.ts         |
| GET    | /me                   | MeController.get                | 200     | 200      | Explicit    | Auth errors below                                                                                                               | me.e2e-spec.ts          |
| GET    | /me/residence         | ResidenceController.get         | 200     | 200      | Explicit    | Auth; 404 missing profile; 503 residence unavailable                                                                            | http-status.e2e-spec.ts |
| PUT    | /me/residence         | ResidenceController.update      | 200     | 200      | Explicit    | Auth; 400 invalid payload/unknown country; 404 missing profile; 503 unavailable                                                 | http-status.e2e-spec.ts |
| GET    | /countries            | CountriesController.list        | 200     | 200      | Explicit    | No specific business errors                                                                                                     | trips.e2e-spec.ts       |
| GET    | /cities               | CitiesController.list           | 200     | 200      | Explicit    | No specific business errors                                                                                                     | http-status.e2e-spec.ts |
| POST   | /trips                | TripsController.create          | 201     | 201      | Explicit    | Auth; 400 invalid fields/dates/countries/cities or city-country mismatch                                                        | trips.e2e-spec.ts       |
| GET    | /me/trips             | TripsJournalController.list     | 200     | 200      | Explicit    | Auth                                                                                                                            | trips.e2e-spec.ts       |
| GET    | /me/trips/:id         | TripsJournalController.detail   | 200     | 200      | Explicit    | Auth; 404 absent or not owned                                                                                                   | trips.e2e-spec.ts       |
| GET    | /me/visited-countries | VisitedCountriesController.list | 200     | 200      | Explicit    | Auth                                                                                                                            | trips.e2e-spec.ts       |
| PUT    | /me/trips/:id/cover   | TripCoversController.replace    | 200     | 200      | Explicit    | Auth; 400 invalid ID/file/multipart; 413 too large; 404 absent/not owned; 409 concurrent change; 503 upload/signing unavailable | covers.e2e-spec.ts      |
| DELETE | /me/trips/:id/cover   | TripCoversController.remove     | 200     | 200      | Explicit    | Auth; 400 invalid ID; 404 absent/not owned; 409 concurrent change                                                               | covers.e2e-spec.ts      |
| GET    | /community/countries  | CommunityController.statistics  | 200     | 200      | Explicit    | 400 missing/invalid year; 503 statistics unavailable                                                                            | community.e2e-spec.ts   |

Auth errors apply to every AuthGuard-protected endpoint: 401 missing/invalid credentials, 422 required/invalid username, 409 username/account-link conflict, 503 auth/provisioning unavailable. Existing 422 is intentional and preserved. Unexpected unhandled exceptions retain Nest's 500 behavior; no artificial business mapping is added.

No real 403 business branch was found. community.e2e-spec.ts uses a guard returning false, which causes Nest's synthetic 403. New residence tests exercise the real AuthGuard and verify 401 without credentials. Ownership failures intentionally use 404, not 403.

DELETE cover intentionally returns TripCoverResponseDto (coverStoragePath, coverUrl, cleanupPending), including repeated deletion with no cover. apps/web/app/services/api/trips.ts expects TripCoverResult and apps/web/app/pages/trips/[id].vue reads the response. Retain explicit HttpStatus.OK and document why; changing to 204 would discard the representation and break this client. No frontend adaptation is needed.

Changes: document the DELETE contract in TripCoversController; replace numeric 409/422 with HttpStatus in authHttpError; add AAA HTTP tests for cities and residence success, actual authentication and existing errors. No DTO, service rule, repository, database or frontend changes.

Ambiguities: none requiring a new status decision. GET /me may provision a local profile as part of authentication; its established public contract remains a 200 profile read (with tested provisioning errors), not a new POST/201 endpoint.

Validation: 120 API unit tests and 44 HTTP/e2e tests pass. HTTP tests use Nest/Supertest with mocked external services or persistence; they do not claim live database/storage verification. Typecheck, build and targeted lint/format results are reported in the task response.
