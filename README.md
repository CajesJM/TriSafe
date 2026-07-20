# TriSafe

TriSafe is a monorepo for Trinidad, Bohol's QR-based transport verification and safety system.

## Structure

```text
apps/
  api/       NestJS + Prisma + PostgreSQL source of truth
  admin/     React + TypeScript LGU dashboard
  mobile/    Flutter passenger/driver app
packages/
  contracts/ Shared enums, API contracts, and fare calculation
```

## Local setup

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `npm install`.
4. Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

5. Run the API with `npm run dev:api` and the admin app with `npm run dev:admin`.

The API uses bearer access tokens issued by `POST /api/auth/login`. The LGU web app stores the token in the browser and the Flutter app keeps it for the current session. Protected endpoints reject missing or invalid tokens and enforce the user's role.

The seed data adds two Trinidad locations, fare rules in both directions, emergency contacts, and demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| LGU administrator | `admin@trisafe.local` | `admin12345` |
| Passenger | `passenger@trisafe.local` | `passenger123` |
| Driver | `driver@trisafe.local` | `driver12345` |

The demo driver's QR token is `demo-trinidad-qr`. Run `npx prisma db seed` from `apps/api` after the first migration. Seeding is designed to be repeatable; it upserts the demo records and emergency contacts.

For a wired Android test, keep the API running, then run `adb reverse tcp:3000 tcp:3000` before launching Flutter with `--dart-define=API_BASE_URL=http://127.0.0.1:3000/api`.

If a first Docker startup created a stale development volume and Prisma reports `P1000` authentication failure, and the database contains no important data, reset only the local database volume with `docker compose down -v`, then run `docker compose up -d postgres` and the migration commands again.

## Safety rules encoded in the backend

- Only LGU administrators can create driver accounts, franchises, vehicles, QR codes, fare rules, announcements, and reminders.
- Only LGU administrators can update franchise status and expiry; those changes are recorded in the audit trail.
- A QR code resolves only to an active, verified driver and vehicle.
- Fare estimates are calculated from the active LGU fare matrix, never from client-provided prices.
- A ride is temporary while active and becomes history only after completion.
- Incident AI drafts remain drafts; LGU review is the final decision point.

## Verification commands

With PostgreSQL and the API running:

```bash
npm run verify:api
npm run verify:workflow
```

`verify:api` checks health, authentication, role protection, fare rules, and driver access. `verify:workflow` exercises QR verification, fare preview, ride start, SafeShare, AI incident submission, LGU review, ride completion, emergency contacts, and ride history against the real database. It creates one completed acceptance-test ride and one reviewed incident.

`GET /api/health` returns `database: "ok"` only after a PostgreSQL connectivity check succeeds.

For role-by-role manual testing, see [docs/ACCEPTANCE_CHECKLIST.md](docs/ACCEPTANCE_CHECKLIST.md).

When `NODE_ENV=production`, the API refuses to start unless `JWT_SECRET` is at least 32 characters and `WEB_ORIGIN` is an explicit HTTPS origin.
