# Finku

Finku is a personal finance app built with Next.js, Prisma, and Supabase.

Current architecture:

- 1 shared Supabase Postgres database
- private data isolation by `userId`
- JWT cookie auth for private API routes
- no default admin credentials committed in code or SQL

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Prisma
- Supabase Postgres
- Tailwind CSS
- TanStack Query

## Local setup

1. Install dependencies.

```bash
bun install
```

2. Copy env template and fill the required values.

```bash
cp .env.example .env
```

Required env vars:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_SECRET`

`JWT_SECRET` must be a random string with at least 32 characters. Placeholder values are rejected at runtime.

3. Generate Prisma client and push schema.

```bash
bun run db:generate
bun run db:push
```

4. Bootstrap the first admin account safely with env vars.

```bash
$env:ADMIN_BOOTSTRAP_USERNAME="admin"
$env:ADMIN_BOOTSTRAP_PASSWORD="replace-with-a-strong-password"
$env:ADMIN_BOOTSTRAP_NAME="Administrator"
$env:ADMIN_BOOTSTRAP_EMAIL="admin@example.com"
bun run admin:bootstrap
```

5. Optional: seed demo transactions for the bootstrap admin.

```bash
$env:SEED_SAMPLE_DATA="true"
bun run db:seed
```

6. Start the app.

```bash
bun run dev
```

## Security and data isolation

- `Transaction`, `Category`, `Budget`, and `UserSettings` are scoped to one user.
- Private API routes resolve the authenticated user from the auth cookie and filter by `userId`.
- Detail routes perform ownership checks before read, update, or delete.
- Passwords are stored as bcrypt hashes only.
- Existing plaintext passwords can be migrated with a dedicated script.
- Official financial summary formula:
  `balance = income - expenses - savings`
- Official savings rate formula:
  `savingsRate = savings / income * 100`

## Import format

- Batch import now accepts `.csv` only.
- File size is limited to 5MB.
- Each import is capped at 1000 rows.
- Import rejects dangerous spreadsheet formula prefixes and invalid dates/amounts.

## Scripts

```bash
bun run dev
bun run build
bun run lint
bun run test
bun run db:generate
bun run db:push
bun run db:seed
bun run admin:bootstrap
bun run passwords:migrate
```

## Supabase bootstrap

For a fresh Supabase database:

1. Apply [`supabase-schema.sql`](./supabase-schema.sql) or run `bun run db:push`.
2. Set `ADMIN_BOOTSTRAP_*` env vars.
3. Run `bun run admin:bootstrap`.

`supabase-schema.sql` intentionally does not insert any default admin or shared sample data.

## Optional feature flags

- `ENABLE_ACTIVE_USERS_METRIC=false`
  disables `/api/users/active` demo output and returns a deterministic response.

## Password migration

If older environments still contain plaintext passwords, run:

```bash
bun run passwords:migrate
```

After migration, plaintext login fallback is no longer accepted.
