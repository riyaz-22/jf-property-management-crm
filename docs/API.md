# API Documentation

Base URL:

```text
http://localhost:3000/api/v1
```

Swagger:

```text
http://localhost:3000/docs
```

All APIs return a response envelope:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-05-25T00:00:00.000Z"
}
```

Errors use:

```json
{
  "success": false,
  "statusCode": 400,
  "path": "/api/v1/example",
  "timestamp": "2026-05-25T00:00:00.000Z",
  "error": {
    "message": "Validation failed"
  }
}
```

## Authentication

Use JWT bearer auth for protected routes:

```http
Authorization: Bearer <accessToken>
```

Public registration is not implemented. Users must be created by admin/user-management flow or startup/seed upsert.

### `POST /auth/login`

Public. Body:

```json
{
  "email": "admin@jfcrm.com",
  "password": "Password123!"
}
```

Returns `user`, `accessToken`, `refreshToken`, and `refreshTokenExpiresAt`.

### `POST /auth/refresh`

Public. Body:

```json
{
  "refreshToken": "opaque-token"
}
```

Rotates the refresh token. The old token is revoked in PostgreSQL.

### `POST /auth/logout`

Public endpoint that revokes the supplied refresh token when present.

```json
{
  "refreshToken": "opaque-token"
}
```

### `POST /auth/forgot-password`

Public. Body:

```json
{
  "email": "admin@jfcrm.com"
}
```

Creates a password reset token for active users. Email delivery is not configured; local response may include the reset token.

### `POST /auth/reset-password`

Public. Body:

```json
{
  "token": "reset-token",
  "password": "NewPassword123!"
}
```

Hashes the new password and revokes active refresh tokens for that user.

## Pagination, Search, Sorting

List endpoints support shared pagination params unless noted:

```text
page
limit
search
sortBy
sortOrder=asc|desc
```

Paginated data shape:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

## RBAC Rules

- `SUPER_ADMIN`, `ADMIN`: full user management and delete permissions on protected admin endpoints.
- `MANAGER`: property create/update and notification create/update.
- Other roles can access authenticated read/list endpoints unless a controller method has `@Roles`.

## Users

Routes require JWT. Admin-only routes require `SUPER_ADMIN` or `ADMIN`.

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/users/me` | Any authenticated user | none |
| GET | `/users` | Admin | `page`, `limit`, `search`, `role`, `isActive`, `sortBy`, `sortOrder` |
| GET | `/users/:id` | Admin | none |
| POST | `/users` | Admin | create user body |
| PATCH | `/users/:id` | Admin | partial user body |
| DELETE | `/users/:id` | Admin | soft deactivates user |
| POST | `/users/:id/avatar` | Admin | multipart `avatar` upload |
| DELETE | `/users/:id/avatar` | Admin | removes profile image |
| POST | `/users/me/avatar` | Any authenticated user | multipart `avatar` upload |
| DELETE | `/users/me/avatar` | Any authenticated user | removes own profile image |

Create body:

```json
{
  "email": "agent@example.com",
  "password": "Password123!",
  "firstName": "Avery",
  "lastName": "Agent",
  "phone": "+44 7700 900 000",
  "role": "AGENT"
}
```

Valid user sort fields: `email`, `firstName`, `lastName`, `role`, `isActive`, `createdAt`, `updatedAt`.

User filtering supports:

```text
role=ADMIN|MANAGER|STAFF|AGENT|ACCOUNTANT|MAINTENANCE|VIEWER|SUPER_ADMIN
isActive=true|false
```

Deletes are production-safe soft deactivations: `deletedAt` is set and `isActive=false`.

## Dashboard

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/dashboard/summary` | JWT | Returns KPI counts, revenue trend, maintenance status breakdown, recent activity |

Metrics are calculated from live PostgreSQL rows.

## Properties

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/properties` | JWT | `status`, `type`, `city`, pagination/search/sort |
| GET | `/properties/:id` | JWT | none |
| POST | `/properties` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | create property |
| PATCH | `/properties/:id` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | partial property |
| DELETE | `/properties/:id` | `SUPER_ADMIN`, `ADMIN` | soft delete |

Create fields include `reference`, `title`, `type`, `status`, address fields, bedrooms, bathrooms, rent/deposit, optional asking price, owner details, and optional `managerId`.

## Tenants

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/tenants` | JWT | `status`, `propertyId`, pagination/search/sort |
| GET | `/tenants/:id` | JWT | none |
| POST | `/tenants` | JWT | create tenant |
| PATCH | `/tenants/:id` | JWT | partial tenant |
| PATCH | `/tenants/:id/assign` | JWT | `{ "propertyId": "..." }` |
| DELETE | `/tenants/:id` | JWT | soft delete |

## Leases

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/leases` | JWT | `status`, `propertyId`, `tenantId`, pagination/search/sort |
| GET | `/leases/expiring` | JWT | leases nearing expiry |
| GET | `/leases/:id` | JWT | none |
| POST | `/leases` | JWT | create lease |
| PATCH | `/leases/:id` | JWT | partial lease |
| PATCH | `/leases/:id/renew` | JWT | `{ "endDate": "...", "rentAmount": 1500 }` |
| DELETE | `/leases/:id` | JWT | soft delete |

## Payments

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/payments` | JWT | `status`, `propertyId`, `tenantId`, pagination/search/sort |
| GET | `/payments/due-reminders` | JWT | pending/overdue reminders |
| GET | `/payments/:id` | JWT | none |
| POST | `/payments` | JWT | create payment |
| PATCH | `/payments/:id` | JWT | partial payment |
| PATCH | `/payments/:id/mark-paid` | JWT | optional `method`, optional `paidAt` |
| DELETE | `/payments/:id` | JWT | soft delete |

## Maintenance

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/maintenance` | JWT | `status`, `priority`, `propertyId`, `assigneeId`, pagination/search/sort |
| GET | `/maintenance/:id` | JWT | none |
| POST | `/maintenance` | JWT | create ticket |
| PATCH | `/maintenance/:id` | JWT | partial ticket |
| PATCH | `/maintenance/:id/assign` | JWT | `{ "assigneeId": "..." }` |
| PATCH | `/maintenance/:id/status` | JWT | `{ "status": "IN_PROGRESS" }` |
| POST | `/maintenance/:id/attachments` | JWT | `{ "attachmentUrl": "..." }` |
| DELETE | `/maintenance/:id` | JWT | soft delete |

## Notifications

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/notifications` | JWT | `unread=true`, `userId`, pagination/search/sort |
| GET | `/notifications/unread-count` | JWT | none |
| POST | `/notifications` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | create notification |
| PATCH | `/notifications/:id` | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | update notification |
| PATCH | `/notifications/:id/read` | JWT | marks own notification read |
| PATCH | `/notifications/read-all` | JWT | marks current user's notifications read |
| DELETE | `/notifications/:id` | JWT | scoped delete; elevated roles can delete any |

## Contacts and Sell Intent

Contact routes require JWT.

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/contacts` | JWT | `role`, `city`, pagination/search/sort |
| GET | `/contacts/:id` | JWT | accepts contact id or slug |
| POST | `/contacts` | JWT | create contact |
| PATCH | `/contacts/:id` | JWT | partial contact |
| DELETE | `/contacts/:id` | JWT | soft delete |
| POST | `/contacts/:id/avatar` | JWT | multipart `avatar` upload |
| DELETE | `/contacts/:id/avatar` | JWT | removes contact profile image |
| GET | `/contacts/:id/sell-intent` | JWT | returns/creates current sell intent |
| PATCH | `/contacts/:id/sell-intent/checklist` | JWT | `{ "label": "...", "completed": true }` |
| POST | `/contacts/:id/appointments` | JWT | schedules valuation |
| PATCH | `/contacts/appointments/:id` | JWT | updates valuation appointment |

Valuation scheduling also creates a calendar appointment row so the Calendar workspace can refresh from PostgreSQL.

## Calendar

Calendar routes require JWT and persist to PostgreSQL.

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/calendar/appointments` | JWT | `start`, `end` ISO date strings |
| POST | `/calendar/appointments` | JWT | create appointment |
| PATCH | `/calendar/appointments/:id` | JWT | update/reschedule appointment |
| DELETE | `/calendar/appointments/:id` | JWT | soft cancel/delete appointment |

Create/update body:

```json
{
  "title": "Glass House valuation",
  "type": "VALUATION",
  "status": "CONFIRMED",
  "startsAt": "2026-05-26T10:00:00.000Z",
  "endsAt": "2026-05-26T11:00:00.000Z",
  "durationMinutes": 60,
  "agentId": "uuid",
  "propertyId": "uuid",
  "contactId": "uuid",
  "reference": "VAL-001",
  "location": "14 Cheltenham Place",
  "notes": "Vendor confirmed access.",
  "reminderAt": "2026-05-26T09:30:00.000Z"
}
```

Calendar behavior:
- Month, week, and day views are frontend views over the same persisted appointment API.
- Overlapping active bookings for the same assigned agent are rejected.
- Status changes are recorded in `AppointmentStatusHistory`.
- Delete marks appointments cancelled/deleted rather than hard-removing history.

## AI Chat

AI chat routes require JWT. The current assistant is intentionally lightweight and rule-based; no external LLM provider is called.

| Method | Route | Auth | Query/Body |
| --- | --- | --- | --- |
| GET | `/ai-chat/session` | JWT | returns or creates the current user's assistant session |
| GET | `/ai-chat/sessions/:id/messages` | JWT | returns persisted messages |
| POST | `/ai-chat/sessions/:id/messages` | JWT | `{ "content": "..." }` |

Message response:

```json
{
  "userMessage": {
    "id": "uuid",
    "sessionId": "uuid",
    "role": "USER",
    "content": "Summarise today",
    "createdAt": "2026-05-26T00:00:00.000Z"
  },
  "assistantMessage": {
    "id": "uuid",
    "sessionId": "uuid",
    "role": "ASSISTANT",
    "content": "Quick summary: review active contacts...",
    "createdAt": "2026-05-26T00:00:00.000Z"
  }
}
```

## Error Handling

- `400`: DTO validation or malformed input.
- `401`: invalid credentials, expired JWT, invalid/expired/revoked refresh token.
- `403`: inactive account, missing role, insufficient RBAC permissions.
- `404`: record not found.
- `409`: duplicate unique fields such as email/reference.
- Calendar overlap conflicts are returned as `400` with a readable validation message.
- `500`: unexpected backend or database error.

Frontend maps API errors into readable messages and retries eligible list queries. A `401` triggers one refresh-token attempt before logout.
