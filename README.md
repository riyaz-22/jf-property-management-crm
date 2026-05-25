# JF Property Management CRM

Full-stack property management CRM implemented with a React/Vite frontend, NestJS backend, PostgreSQL, Prisma, JWT authentication, and RBAC. The project uses the existing repository structure and persists operational CRM data in PostgreSQL.

## Current Stack

Frontend:
- React 19, Vite, TypeScript
- React Router protected routes
- TanStack Query for server state
- Zustand localStorage session persistence
- Axios API client with bearer-token injection and refresh retry
- React Hook Form, Zod, Tailwind CSS, lucide-react

Backend:
- NestJS, TypeScript
- Prisma 7 with PostgreSQL
- JWT access tokens and rotating opaque refresh tokens
- bcrypt password hashing
- Global validation pipe, exception filter, response envelope interceptor
- Swagger at `http://localhost:3000/docs`

## Implemented Modules

- Auth: login, logout, refresh, forgot password, reset password. Public signup is removed.
- Dashboard: live KPI summary, revenue trend, maintenance status breakdown, recent activity.
- User Management: admin-only user CRUD, role assignment, activation/deactivation, password reset by edit.
- Properties: CRUD, search, filter, sort, soft delete.
- Tenants: CRUD, search/filter/sort, current property assignment.
- Leases: CRUD, expiring leases endpoint, renewal endpoint.
- Payments: CRUD, due reminders endpoint, mark-paid endpoint.
- Maintenance: CRUD, assignment, status changes, attachment URL endpoint.
- Notifications: scoped notification list, unread count, read/read-all, admin/manager create/update.
- Contacts and sell-intent workspace: frontend contact intelligence UI with AI Co-Pilot insight panels using local demo contact data.

## Authentication Flow

Accounts are created internally through User Management or startup/seed logic. Public registration is disabled.

Login:
1. User submits email/password to `POST /api/v1/auth/login`.
2. Backend validates an active, non-deleted PostgreSQL user and bcrypt password hash.
3. Backend returns a JWT access token, opaque refresh token, sanitized user, and refresh expiry.
4. Frontend stores the session in Zustand/localStorage and attaches `Authorization: Bearer <accessToken>` to API requests.

Refresh:
- On `401`, Axios attempts `POST /auth/refresh` once with the stored refresh token.
- Refresh tokens are stored hashed in PostgreSQL.
- Rotation revokes the old refresh token and stores the replacement.

RBAC:
- Roles are stored on `User.role`.
- Current roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, `AGENT`, `ACCOUNTANT`, `MAINTENANCE`, `VIEWER`.
- User Management is restricted to `SUPER_ADMIN` and `ADMIN`.
- Property and notification create/update operations allow `SUPER_ADMIN`, `ADMIN`, and `MANAGER`.

Default local credentials:

```text
admin@jfcrm.local / Password123!
manager@jfcrm.local / Password123!
admin@jfcrm.com / Password123!
manager@jfcrm.com / Password123!
```

## Database and Seed

Primary schema: `backend/prisma/schema.prisma`

Startup validation in `DatabaseBootstrapService`:
- Verifies PostgreSQL connectivity.
- Verifies Prisma migration table and pending migrations.
- Ensures required role enum values exist.
- Upserts required internal auth users without wiping data.

Seed behavior:
- `npx prisma db seed` always upserts required internal users.
- Demo CRM data only runs when `SEED_DEMO_DATA=true`.
- Seed uses bcrypt and Prisma upsert and does not reset tables.

## Setup

Prerequisites:
- Node.js 20+
- PostgreSQL
- npm

Install:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Backend `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jf_property_crm?schema=public"
PORT=3000
FRONTEND_URL="http://localhost:5173"
JWT_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
CORS_ORIGIN="http://localhost:5173"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
```

Database:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Start:

```bash
cd backend
npm run start:dev

cd ../frontend
npm run dev
```

URLs:
- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`

## Verification

Common checks:

```bash
cd backend
npm run build
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

cd ../frontend
npm run build
```

Vite currently warns about a large single bundle. Route-level code splitting is a known production optimization.

## Documentation

- [AI chat and Co-Pilot history](docs/AI_CHAT_HISTORY.md)
- [API documentation](docs/API.md)
- [Assumptions and constraints](docs/ASSUMPTIONS.md)
- [Database documentation](docs/DATABASE.md)
