# JF Property Management CRM

Full-stack property management CRM built for the assignment using the existing repository structure.

## Tech Stack

Frontend:
- React, Vite, TypeScript
- React Router
- TanStack Query
- Zustand for auth/session persistence
- React Hook Form and Zod
- Tailwind CSS
- Axios with auth interceptors
- Framer Motion

Backend:
- Node.js, NestJS, TypeScript
- Prisma ORM
- PostgreSQL
- JWT access tokens and rotating refresh tokens
- RBAC guards
- Swagger API docs

## Main Features

- Authentication: login, logout, forgot password, reset password, JWT refresh flow, protected frontend routes.
- Dashboard: KPI cards, analytics, and activity feed calculated dynamically from PostgreSQL.
- Contacts: screenshot-matched contact directory, contact drawer, contact detail, sell intent workspace, valuation scheduler.
- Properties: CRUD-ready listing, search/filter/sort API support, soft delete.
- Tenants: CRUD-ready tenant records, property assignment endpoint.
- Leases: lifecycle tracking, renewals, expiry endpoint.
- Payments: transaction tracking, mark-paid endpoint, due reminders.
- Maintenance: ticket workflow, assignment, status changes, attachment endpoint.
- Notifications: notification center, unread count, mark read/all read.
- User management: admin-only CRUD and roles.

## Repository Structure

```text
backend/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    common/
    modules/
      auth/
      users/
      dashboard/
      properties/
      tenants/
      leases/
      payments/
      maintenance/
      notifications/
    prisma/
frontend/
  src/
    app/
    components/
    constants/
    layouts/
    modules/
    services/
    types/
    utils/
docs/
```

## Setup

Prerequisites:
- Node.js 20+
- PostgreSQL
- npm

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create backend environment:

```bash
cd backend
copy .env.example .env
```

Update `backend/.env` with your PostgreSQL connection:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jf_property_crm?schema=public"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
```

Create frontend environment:

```bash
cd frontend
copy .env.example .env
```

Run database migrations and seed:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Start backend:

```bash
cd backend
npm run start:dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open:
- Frontend: `http://localhost:5173`
- Swagger API docs: `http://localhost:3000/docs`
- API root: `http://localhost:3000/api/v1`

Seed login:

```text
Email: admin@jfcrm.com
Password: Password123!
```

Additional seeded manager:

```text
Email: manager@jfcrm.com
Password: Password123!
```

## Verification

Commands used to verify the current implementation:

```bash
cd frontend
npm run build

cd ../backend
npm run build
npm test -- app.controller.spec.ts
npm run prisma:generate
```

Note: Vite may warn that the frontend bundle is over 500 kB because this assignment builds the main CRM workflow in one app shell. A production pass would add route-level code splitting.

## API Documentation

Swagger is available at:

```text
http://localhost:3000/docs
```

Static API notes are in [docs/API.md](docs/API.md).

## Database Schema

The Prisma schema is in:

```text
backend/prisma/schema.prisma
```

Database design notes are in [docs/DATABASE.md](docs/DATABASE.md).

## Assignment Notes

- Assumptions and technical considerations: [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)
- AI chat history summary: [docs/AI_CHAT_HISTORY.md](docs/AI_CHAT_HISTORY.md)

## Production Behavior

The frontend uses real Axios services and protected routes. CRM modules load from the NestJS API, and the NestJS API persists all CRUD data in PostgreSQL through Prisma. Dashboard metrics are calculated from live database rows, not hardcoded values.
