# JF Property Management CRM

A production-style full-stack property management CRM featuring JWT authentication, role-based access control, calendar scheduling, AI assistant persistence, and a responsive enterprise UI.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Authentication Flow](#authentication-flow)
- [RBAC Roles](#rbac-roles)
- [Implemented Modules](#implemented-modules)
- [API Overview](#api-overview)
- [Project Structure](#project-structure)
- [Verification](#verification)
- [Known Constraints](#known-constraints)
- [Documentation](#documentation)

---

## Tech Stack

### Frontend

| Tool | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| React Router | Protected client-side routing |
| TanStack Query | Server state, caching, invalidation |
| Zustand | Auth session persistence (localStorage) |
| Axios | HTTP client with bearer-token injection and refresh retry |
| React Hook Form + Zod | Form handling and validation |
| Tailwind CSS + lucide-react | Styling and icons |

### Backend

| Tool | Purpose |
|---|---|
| NestJS + TypeScript | Modular server framework |
| Prisma 7 | ORM, schema management, migrations |
| PostgreSQL | Relational database |
| JWT (access + refresh) | Stateless authentication |
| bcrypt | Password hashing |
| Global validation pipe | DTO validation |
| Exception filter + response envelope interceptor | Consistent API responses |
| Swagger | Interactive API docs at `/docs` |

---

## Prerequisites

- **Node.js** v20+
- **PostgreSQL** (running locally or via connection string)
- **npm**

---

## Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## Environment Variables

### Backend — `backend/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jf_property_crm?schema=public"
PORT=3000
FRONTEND_URL="http://localhost:5173"
CORS_ORIGIN="http://localhost:5173"

# Auth secrets — replace with long random strings in production
JWT_SECRET="replace-with-a-long-random-access-secret"
JWT_ACCESS_SECRET="replace-with-a-long-random-access-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-refresh-secret"

JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
```

> Set `SEED_DEMO_DATA=true` to populate sample contacts, properties, leases, and payments when running the seed script.

### Frontend — `frontend/.env`

```env
VITE_API_BASE_URL="http://localhost:3000/api/v1"
```

---

## Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed required system users (+ demo data if SEED_DEMO_DATA=true)
npx prisma db seed
```

**Seed behavior:**
- Always upserts required internal auth users using bcrypt — no tables are wiped.
- Demo CRM data (contacts, properties, leases, payments) only runs when `SEED_DEMO_DATA=true`.

**Startup validation** (`DatabaseBootstrapService` runs automatically):
- Verifies PostgreSQL connectivity.
- Checks Prisma migration state and fails startup if migrations are pending.
- Ensures required role enum values exist.
- Upserts required internal users without resetting existing data.

---

## Running the Application

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run start:dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

| URL | Description |
|---|---|
| `http://localhost:5173` | Frontend application |
| `http://localhost:3000/api/v1` | REST API base URL |
| `http://localhost:3000/docs` | Swagger interactive docs |

---

## Default Credentials

> Public self-registration is disabled. Users are created via the User Management module (admin only) or the seed script.

| Email | Role | Password |
|---|---|---|
| `admin@jfcrm.local` | ADMIN | `Password123!` |
| `manager@jfcrm.local` | MANAGER | `Password123!` |
| `admin@jfcrm.com` | ADMIN | `Password123!` |
| `manager@jfcrm.com` | MANAGER | `Password123!` |

---

## Authentication Flow

**Login**
1. User submits email and password to `POST /api/v1/auth/login`.
2. Backend validates an active, non-deleted user record and bcrypt password hash.
3. Backend returns a short-lived JWT access token, opaque refresh token, sanitized user object, and refresh expiry.
4. Frontend stores the session in Zustand/localStorage and attaches `Authorization: Bearer <accessToken>` to every subsequent request.

**Token Refresh**
- On a `401` response, Axios automatically retries once using `POST /auth/refresh` with the stored refresh token.
- Refresh tokens are stored hashed in PostgreSQL.
- Each rotation revokes the old token and stores the new one (one active refresh token per session).

**Logout**
- `POST /auth/logout` revokes the active refresh token in PostgreSQL.

---

## RBAC Roles

| Role | Level |
|---|---|
| `SUPER_ADMIN` | Full system access |
| `ADMIN` | User management, all CRM modules |
| `MANAGER` | Property and notification create/update |
| `STAFF` | Authenticated read/list access |
| `AGENT` | Authenticated read/list access |
| `ACCOUNTANT` | Authenticated read/list access |
| `MAINTENANCE` | Authenticated read/list access |
| `VIEWER` | Read-only access |

User Management is restricted to `SUPER_ADMIN` and `ADMIN`. Property and notification create/update allow `SUPER_ADMIN`, `ADMIN`, and `MANAGER`.

---

## Implemented Modules

| Module | Description |
|---|---|
| **Auth** | Login, logout, token refresh, forgot password, reset password. Public signup disabled. |
| **Dashboard** | Live KPI summary, revenue trend, maintenance status breakdown, recent activity feed. |
| **User Management** | Admin-only CRUD, role assignment, activation/deactivation, password reset via edit. |
| **Properties** | Full CRUD with search, filter by status/type/city, sort, and soft delete. |
| **Tenants** | Full CRUD with current property assignment, search/filter/sort. |
| **Leases** | Full CRUD, expiring leases endpoint, renewal endpoint. |
| **Payments** | Full CRUD, due reminders endpoint, mark-paid endpoint. |
| **Maintenance** | Full CRUD, ticket assignment, status change, attachment URL endpoint. |
| **Notifications** | Scoped notification list, unread count, mark read / read-all, admin/manager create. |
| **Contacts & Sell Intent** | Contact directory, inline sell-intent workspace, AI Co-Pilot insight panels, valuation scheduling, mandate stage tracking. |
| **Calendar** | PostgreSQL-persisted appointments with month/week/day views, agent overlap prevention, status history audit trail. |
| **AI Assistant** | Floating chat widget with session and message history persisted in PostgreSQL. Rule-based responses; architected for future LLM integration. |

---

## API Overview

**Base URL:** `http://localhost:3000/api/v1`

All responses use a standard envelope:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-05-26T00:00:00.000Z"
}
```

All errors return:

```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/example",
  "timestamp": "2026-05-26T00:00:00.000Z",
  "error": { "message": "Validation failed" }
}
```

Protected routes require: `Authorization: Bearer <accessToken>`

List endpoints support shared pagination params: `page`, `limit`, `search`, `sortBy`, `sortOrder=asc|desc`

| Group | Key Endpoints |
|---|---|
| Auth | `POST /auth/login` `/auth/refresh` `/auth/logout` `/auth/forgot-password` `/auth/reset-password` |
| Users | `GET/POST /users` `GET/PATCH/DELETE /users/:id` avatar upload |
| Dashboard | `GET /dashboard/summary` |
| Contacts | `GET/POST /contacts` contact detail, sell-intent, valuation scheduling |
| Properties | Full CRUD — status/type/city filtering |
| Tenants | Full CRUD — property assignment |
| Leases | Full CRUD — renew and expiry list |
| Payments | Full CRUD — mark-paid and due reminders |
| Maintenance | Full CRUD — assign, status, attachment |
| Notifications | List, create, mark read, read-all, unread count |
| Calendar | `GET/POST/PATCH/DELETE /calendar/appointments` |
| AI Chat | `/ai-chat/session` `/ai-chat/sessions/:id/messages` |

Full endpoint reference: [`docs/API.md`](docs/API.md) or Swagger at `http://localhost:3000/docs`

---

## Project Structure

```
jf-property-crm/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (source of truth)
│   │   ├── migrations/            # Prisma migration files
│   │   └── seed.ts                # System user + optional demo data seed
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── dashboard/
│       │   ├── contacts/          # Contact directory + sell-intent API
│       │   ├── properties/
│       │   ├── tenants/
│       │   ├── leases/
│       │   ├── payments/
│       │   ├── maintenance/
│       │   ├── notifications/
│       │   ├── calendar/
│       │   └── ai-chat/
│       └── common/                # Guards, interceptors, pipes, decorators
└── frontend/
    └── src/
        ├── modules/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── contacts/          # Inline sell-intent workspace + AI Co-Pilot
        │   ├── calendar/
        │   ├── payments/
        │   ├── notifications/
        │   └── users/
        └── services/              # Per-module Axios wrappers
```

---

## Verification

Run these checks before submission or deployment:

```bash
# Backend
cd backend
npm run build
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Frontend
cd ../frontend
npm run build
```

> Vite will warn about a large single bundle. Route-level code splitting is a known production optimization that has not yet been applied.

---

## Known Constraints

- Single-tenant application — no multi-organisation support.
- Email delivery (SMTP) is not configured. Password reset tokens are returned in the local API response for development.
- AI assistant is rule-based. No external LLM provider is called at runtime; the system is architected to support future OpenAI or similar integration.
- File storage uses local backend `uploads` paths. No CDN or cloud storage is configured.
- Calendar realtime updates use React Query invalidation and refetch. WebSocket push is not implemented.
- Automated test coverage is limited compared to a production CRM.
- Vite emits a bundle-size warning as route-level code splitting is not yet implemented.

---

## Documentation

| Document | Description |
|---|---|
| [`docs/AI_CHAT_HISTORY.md`](docs/AI_CHAT_HISTORY.md) | Full AI development chat history and architectural decisions |
| [`docs/API.md`](docs/API.md) | Complete API endpoint reference |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Technical assumptions and constraints |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Database schema, table descriptions, and enum reference |