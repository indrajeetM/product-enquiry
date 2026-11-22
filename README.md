# Product Enquiry

A Laravel 12 and React application for browsing a product catalogue and managing product enquiries. Visitors can browse products, categories, and search results without an account. Customers can sign in to submit enquiries and review their enquiry history. Administrators can manage account access, control featured products, and process enquiries.

Product data is imported from [FakeStore API](https://fakestoreapi.com/products) and stored locally in the database. The seeder ignores FakeStore's product IDs and uses the product details to create or update local records.

## Requirements

- PHP 8.2 or newer
- Composer
- Node.js and npm
- Internet access when running the product seeder
- SQLite (the default configuration) or a configured MySQL database

## Local setup

1. Clone the repository and enter the project directory:

   ```bash
   git clone git@github.com:indrajeetM/product-enquiry.git
   cd product-enquiry
   ```

2. Create the local environment file and install dependencies:

   ```bash
   cp .env.example .env
   composer install
   npm install
   ```

3. Configure the admin seed password in `.env` before seeding:

   ```dotenv
   ADMIN_SEED_PASSWORD="choose-a-strong-local-password"
   ```

   The seeder creates or updates the admin account `test@gmail.com`. Keep `.env` private and do not commit the password.

4. Generate the application key, create the default SQLite database file, then migrate and seed:

   ```bash
   php artisan key:generate
   php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
   php artisan migrate --seed
   ```

   The product seeder downloads the FakeStore products and stores them in the configured database. The seed command requires the FakeStore API to be reachable. For MySQL, configure `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `.env` and create the database before migrating.

5. Start the local application:

   ```bash
   composer run dev
   ```

   This development command starts Laravel, Vite, log output, and a queue listener (`php artisan queue:listen --tries=1`). The queue listener processes enquiry email jobs, so a separate worker is not needed while using `composer run dev`.

   If you run the application without `composer run dev`, start a queue worker in its own terminal:

   ```bash
   php artisan queue:work --tries=3
   ```

   Do not run a second worker alongside `composer run dev` unless you intentionally want multiple workers.

The storefront is available at [http://localhost:8000](http://localhost:8000). The registration page is at `/register`, and the login page is at `/login`.

## Application flow

### Customers

1. Browse featured products, choose a category, or search the catalogue.
2. Open a product page to view its details and related featured products.
3. Register or log in to submit an enquiry.
4. Review enquiry status and administrator remarks from **My enquiries** in the account workspace.

Customers can have one pending enquiry per product. Once an enquiry is completed, it cannot be edited again, and the customer may submit a new enquiry for that product.

### Administrators

1. Sign in as `test@gmail.com` using the password configured by `ADMIN_SEED_PASSWORD`.
2. Use the admin workspace to search and filter users, products, and enquiries.
3. Activate or deactivate user accounts, set home-page and category featured flags, and update enquiry status with an administrator remark.
4. Completed enquiries are read-only and cannot be changed again.

### Email notifications

Enquiry submission and completion notifications are queued. The default `MAIL_MAILER=log` writes email content to the Laravel log and does not deliver messages to recipients. Configure a mail transport in `.env` to send real email. `composer run dev` already starts a queue listener; when running the application components separately or deploying, run a worker such as `php artisan queue:work --tries=3`.

For API routes, payload formats, validation, and authorization details, see [the API guide](docs/product-enquiry-api.md).