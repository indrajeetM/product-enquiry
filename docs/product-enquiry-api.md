# Product catalogue and enquiry API

The application exposes same-origin JSON endpoints under `/api`. They use the existing Laravel session cookie and web CSRF middleware; do not send a user ID to identify the current account. The personal enquiry endpoints derive the owner from the signed-in session.

## Public catalogue

| Method and path                           | Purpose                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /api/products`                       | All active products                                                                   |
| `GET /api/products/featured`              | Active globally featured products                                                     |
| `GET /api/products/search?q=...`          | Case-sensitive search over title, category, description, and the decimal price string |
| `GET /api/products/{product}`             | Active product details                                                                |
| `GET /api/categories`                     | Unique categories of active products                                                  |
| `GET /api/categories/{category}/products` | Active products in the exact-case category                                            |
| `GET /api/categories/{category}/featured` | Active category-featured products                                                     |

List endpoints accept `page`, `page_size` (default 12, maximum 48), and allowlisted sort options. Successful responses use `{ "success": true, "message": "...", "data": [...], "meta": { "current_page": 1, "last_page": 1, "per_page": 12, "total": 0, "has_more_pages": false } }`.

## Signed-in user

| Method and path       | Purpose                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `POST /api/enquiries` | Submit `{ "product_id": 1, "description": "..." }`; description limit is 2,000 characters |
| `GET /api/enquiries`  | Current user's latest-first paginated enquiry history                                     |

Enquiry submission requires an active account and is limited to one request per user per minute. A user can have one pending enquiry for a product; after completion, a later enquiry is allowed. A successful submission queues an email containing the product, enquiry description, and pending status.

## Admin

All admin endpoints require an active session account with `is_admin=true`.

| Method and path                        | Purpose                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/users`                 | Paginated users; optional `is_admin`, `q`, `sort_by`, and `sort_direction`                                 |
| `PATCH /api/admin/users/active`        | Set `{ "email": "...", "is_active": false }`; user IDs are not used                                        |
| `GET /api/admin/products`              | Paginated products; optional category, active/global-featured/category-featured flags, search, and sorting |
| `PATCH /api/admin/products/{product}`  | Set `{ "is_featured": true, "is_featured_in_category": false }`                                            |
| `GET /api/admin/categories`            | Unique categories across all products                                                                      |
| `GET /api/admin/enquiries`             | Paginated enquiries; optional product, status, relational search, and sorting                              |
| `PATCH /api/admin/enquiries/{enquiry}` | Submit `{ "status": "pending"                                                                              | "completed", "admin_remarks": "..." }`; remark is required and limited to 255 characters. Completed enquiries are immutable and return 409 on further updates. |

Updates must use the listed `PATCH` method, an authenticated session, and the session CSRF token. Visiting an update URL in a browser sends `GET` and does not perform an update.

User list responses omit user IDs, authentication fields, and credentials. Enquiry responses include the enquiry reference and product details but omit `user_id`; admin views include only the user's name and email. Moving an enquiry to completed queues an email with the same product/enquiry details, completed status, and admin remark.

Deleting a user account preserves enquiry records and clears the nullable user relation; deleting a referenced product is restricted so enquiry history is not cascaded away.

## Errors and operations

API errors use `{ "success": false, "message": "...", "errors": {...} }` where field validation details apply. Expected HTTP statuses include 401, 403, 404, 405, 409, 422, and 429. Unexpected failures are logged server-side and return a generic 500 response without stack traces or file paths.

Search matching is explicitly case-sensitive on the configured MySQL database and SQLite test database. Sort fields and page sizes are validated and allowlisted.

Set `ADMIN_SEED_PASSWORD` in the local/deployment environment before running `php artisan db:seed`. The product seeder retrieves and validates FakeStore products, ignores their remote IDs, and is safe to rerun. Do not commit the admin password or mail credentials.

For real notifications, configure `MAIL_MAILER` and its transport credentials in the environment. The default mailer is `log`, which does not deliver messages to recipients and may write message content to local logs. Use the configured database queue and keep a worker running, for example `php artisan queue:work`; notification mail is queued after its database transaction commits and retries transient failures up to three times. Monitor failed jobs and logs.
