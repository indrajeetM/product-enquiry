# Product Enquiry Implementation Plan

## Goal and current state

Build a public product catalogue and enquiry flow on the existing Laravel 12 + Inertia/React application, with session-authenticated user actions and admin-only enquiry/catalogue APIs.

The repository already has product, enquiry, and user-flag migrations, but the product/enquiry migrations and the current welcome page are untracked/modified worktree changes. They must be preserved and incorporated rather than reset. The current schema includes product feature/active flags, an `enquiry` table with user/product foreign keys, and `is_admin`/`is_active` user flags. The app does not yet have Product/Enquiry models, product/enquiry endpoints, an admin authorization layer, or the requested storefront; the welcome page is still a placeholder. Existing Laravel session auth and Inertia/React scaffolding can be reused.

## Agreed behavior and implementation defaults

- An authenticated user may have only one **pending** enquiry per product. Once it is completed, a new enquiry is allowed.
- Enquiry creation is limited to one request per authenticated user per minute. Return HTTP 429 with a retry interval; rate limiting for admin status changes is separately keyed and configured conservatively.
- FakeStore featured flags are assigned deterministically: a small global featured set and at least one category-featured product per category. Ignore the remote API ID.
- The test admin is `test@gmail.com`; use Faker for other profile data and require `ADMIN_SEED_PASSWORD` from environment configuration rather than committing a password.
- The enquiry description limit is 2,000 characters; admin remarks are required on status updates and limited to 255 characters.
- The normal application database target is configured MySQL; tests use SQLite. Case-sensitive search must be explicit and tested against both rather than relying on default collations.
- The admin users API may return only name, email, active/admin flags, and timestamps. Never return user IDs, passwords, tokens, or other authentication secrets.
- Queue an email after a user's enquiry is successfully saved, containing product/enquiry details and current status. When an admin marks it completed, queue a follow-up with the same details and admin remark.
- Public catalog and search pages remain accessible without login. Enquiry submission/history require an authenticated active user; admin endpoints require an authenticated active admin.
- Use same-origin session/cookie authentication and CSRF protection. User identity for personal operations is always derived from the session, never from a client-supplied user ID. Encoding an identifier is not authorization; do not use encoded IDs as a substitute for access control.
- Use a consistent success/error response envelope. Handle validation/auth/authorization/not-found/rate-limit errors with appropriate HTTP codes and safe messages. Do not return stack traces, filenames, SQL, or exception details to clients. Prefer centralized Laravel exception rendering over repetitive broad `try/catch` blocks in every controller; catch and report only errors where recovery/translation is intentional (notably the external seeder request).

## Phased implementation

### Phase 1 — Domain models, schema integrity, and seeders

- Add Product and Enquiry models, safe casts, and explicit user/product/enquiry relationships; keep mass assignment restricted.
- Review the existing migrations and add forward-only schema changes as needed:
  - Enlarge enquiry description storage to 2,000 characters.
  - Ensure `is_active` is removed during rollback of the existing user-flags migration.
  - Add appropriate indexes for public filters, joins, status, and chronology.
  - Enforce the one-pending-enquiry-per-user/product rule atomically in the database, while allowing completed enquiries and a later new pending enquiry.
  - Preserve enquiry history when products/users are removed; prefer deactivation and restrict hard deletion rather than cascading away audit records.
- Add `EnquiryStatus` and pagination/feature constants using project-appropriate PHP enum/constant conventions. Keep global and validation messages in a central messages enum/catalog without leaking internal errors.
- Create an idempotent FakeStore seeder: request `https://fakestoreapi.com/products` with timeout/retry and response validation, ignore returned IDs, map title/description/price/category/image/rating safely, assign reproducible feature flags, and fail visibly if the provider is unavailable or malformed.
- Create a dedicated admin seeder that upserts `test@gmail.com`, uses Faker for profile fields, marks the account active/admin, and requires the password environment variable. Update DatabaseSeeder orchestration without creating duplicate test accounts.
- Add focused model/schema/seeder tests, including reruns and pending/completed duplicate behavior.

### Phase 2 — Public catalog and product APIs

- Add same-origin JSON endpoints for paginated featured products, unique categories, category-filtered featured products, category product listings, product details, and product search.
- Support search across category/title/description and string representations of price; use parameterized, escaped queries and explicit case-sensitive matching for both configured MySQL and SQLite.
- Use allowlisted sort fields/directions, bounded page sizes sourced from a shared constant, stable secondary ordering, eager loading where applicable, and a consistent pagination metadata shape suitable for infinite scroll.
- Return only public product fields and exclude inactive products from public-facing results/details.
- Add endpoint tests for pagination, filters, exact case sensitivity, inactive/not-found products, malformed sort/filter input, and response envelopes.

### Phase 3 — Authenticated user enquiry APIs and safeguards

- Add active-user middleware on enquiry creation and enquiry history; retain Laravel session authentication and CSRF handling.
- Create enquiry requests with description-length validation and active-product validation. Derive `user_id` only from the authenticated session; never accept it from request data.
- Prevent a second pending enquiry for the same user/product with an atomic database-backed constraint/transaction. Return a clear conflict response for duplicates; allow a new enquiry after completion.
- Add latest-first, paginated personal enquiry history with minimal fields and no user ID.
- Apply per-user rate limiting to enquiry submissions and standard throttled responses. Ensure rate-limit storage uses configured Laravel cache infrastructure; no extra rate-limit table is needed unless the configured cache driver requires it.
- Test guest/inactive-user rejection, product availability, duplicate races/logic, successful repeat after completion, rate limits, and response privacy.

### Phase 4 — Admin APIs and authorization

- Add admin middleware that requires both an active authenticated account and `is_admin`; protect every admin endpoint, not just the UI.
- Implement paginated user listing with admin/non-admin filters and safe fields; paginated product listing with category/active/featured filters; a category filter endpoint; and enquiry listing with product/status/search filters and stable ordering.
- Implement an admin status/remark endpoint with strict status allowlisting, required remark validation, and atomic handling of transitions (including conflicts if reopening would create a second pending enquiry).
- Use case-sensitive relational search with parameterized queries, allowlisted sort fields/direction, bounded pagination, and eager-loaded minimal related data.
- Add tests for unauthenticated, inactive, non-admin, filter/sort/search correctness, privacy, invalid transitions, and status/remark persistence.

### Phase 5 — Asynchronous enquiry email notifications

- Add queued notification mailables/jobs for enquiry submission and completion. The initial email includes product details, the user's enquiry description, and pending status; the completion email repeats those details and includes the completed status and admin remark.
- Dispatch only after the enquiry/status transaction commits, and capture the status/remark for that specific event so a later status change cannot make a delayed email misleading.
- Reuse the existing `jobs`/`failed_jobs` schema and database queue configuration; ensure jobs are dispatched after commit (the current database queue config has `after_commit` disabled), and document/run a queue worker in non-sync environments.
- Configure mail transport through environment settings. The current default mailer is `log`, so real delivery requires deployment mail configuration; never put SMTP credentials in source control.
- Define retry/failure logging without exposing email or enquiry content in client-facing errors. Test queued recipients/payloads and completion remarks with Laravel mail/queue fakes, plus dispatch behavior on transaction rollback.

### Phase 6 — Public storefront and end-to-end verification

- Replace the placeholder welcome page with a responsive storefront using backend APIs for all product/category data: header with login/register, category dropdown with “All”, search, featured product grid, and infinite-scroll pagination.
- Add all-products/category listing pages, product detail page with same-category featured products, and an enquiry modal that submits through the authenticated enquiry API.
- Keep login/register/public browsing accessible without authentication; display clear login prompts for enquiry actions and avoid putting user identifiers or sensitive data in URLs.
- Preserve existing auth routes and session behavior; expose only an allowlisted safe auth user shape to Inertia (the current shared auth prop serializes the full user, including its ID).
- Verify focused Laravel feature tests, frontend build/type/lint, and a manual/API/email-queue flow against configured MySQL as available; retain SQLite test coverage for database-portable behavior.
- Document API routes, pagination/response contracts, seed requirements (`ADMIN_SEED_PASSWORD`), and the MySQL/SQLite case-sensitive search behavior.

## Gaps, logic questions, and security considerations identified

1. **Schema/rollback:** the current user-flags migration drops `is_admin` but not `is_active` in `down()`. Additive migrations should preserve rollback correctness; existing untracked migrations must be integrated carefully.
2. **Missing model relationships:** no Product or Enquiry model exists yet, despite foreign keys being present. Add explicit relationships and indexes to support filtering and latest-first histories.
3. **Pending duplicate race:** an application-only “check then insert” can admit concurrent duplicates. Use a database-enforced pending key/constraint and handle status transitions/reopening atomically.
4. **Referential history:** existing foreign keys cascade-delete enquiries when a product or user is deleted. This can erase support/audit records; prefer deactivation/restricted deletion unless hard-delete retention behavior is explicitly desired.
5. **Status semantics:** the schema stores status as a free string. Validate the pending/completed values in requests and centralize the values; consider a DB constraint if it can be kept portable across MySQL and SQLite.
6. **Description/rating/category shape:** description is currently capped at 255 characters; FakeStore rating is an object (`rate`/`count`) while the schema default is an empty JSON array; category is nullable. Normalize/validate these shapes and ensure categories omit nulls.
7. **Seeder reliability/idempotency:** the external API can fail or change. Validate response fields, timeout/retry, report failures, ignore external IDs, and define a stable local upsert key without deleting products that already have enquiries.
8. **Authentication/authorization:** current auth is session-based, but there is no active-user/admin gate. Keep registration from setting privilege flags, and enforce admin middleware on every admin route.
9. **Identity/privacy:** current Inertia shared auth data serializes the user object and therefore includes a user ID. Use a strict allowlist. For a user's enquiries, derive identity from session; do not accept or encode a client-supplied user ID. Admin APIs can return the agreed limited profile fields but no user ID or credentials.
10. **Search portability:** MySQL's configured default collation is case-insensitive while SQLite behavior differs by operator. Implement explicit case-sensitive semantics and verify on both. Escape `%`/`_`, bind search values, and allowlist sort columns/directions to prevent query manipulation.
11. **Search semantics:** string matching a numeric price needs a defined representation. Plan: match against a normalized decimal string and document the behavior; test examples such as whole and fractional prices.
12. **API error handling:** repetitive broad `try/catch` blocks can hide defects or leak detail. Centralize JSON exception mapping, log internal failures server-side, return generic 500 messages, and retain specific 401/403/404/409/422/429 responses.
13. **Rate limiting:** apply limits at the server, keyed by authenticated user (and separately for admin writes), with clear retry responses. Do not treat frontend disabling as a security control.
14. **Input/output safety:** validate all query/body values, constrain page sizes, use bound queries, avoid mass assignment, serialize only needed fields, and rely on React escaping rather than rendering product text as HTML.
15. **External images:** seeded image URLs are third-party resources and can be unavailable or change. Restrict to valid HTTPS image URLs and do not treat remote response content as trusted HTML/script.
16. **Scope boundary:** requested admin APIs are included; no admin management screens were specified. The frontend phase covers the public storefront and user enquiry modal, not a new admin dashboard.
17. **Email delivery and operations:** the database queue tables and queue worker script already exist, but the queue's `after_commit` option is currently false and the default mailer is `log`. Use post-commit queued mail, configure real mail transport via environment, operate a queue worker, and test/monitor failed jobs. Retries can duplicate a delivered email, so delivery is at-least-once unless a future outbox/idempotency mechanism is added.
