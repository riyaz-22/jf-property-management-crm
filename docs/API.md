# API Documentation

Interactive Swagger docs:

```text
http://localhost:3000/docs
```

Base API URL:

```text
http://localhost:3000/api/v1
```

All application APIs are protected by JWT unless marked public.

## Auth

Public endpoints:

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

Auth behavior:

- Passwords are hashed with bcrypt.
- Access tokens are JWTs.
- Refresh tokens are opaque random tokens stored hashed in PostgreSQL.
- Refresh token rotation revokes the old token and stores the replacement.
- Logout revokes the supplied refresh token.
- Password reset revokes active refresh tokens for that user.
- Public account registration is disabled. Admins create or invite users through User Management.

## Users

```text
GET    /users/me
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
```

Admin-only endpoints use RBAC.

## Dashboard

```text
GET /dashboard/summary
```

Returns KPI cards, analytics data, and recent activity.

## Properties

```text
GET    /properties
GET    /properties/:id
POST   /properties
PATCH  /properties/:id
DELETE /properties/:id
```

Supports pagination, search, sorting, and filters for status/type/city.

## Tenants

```text
GET    /tenants
GET    /tenants/:id
POST   /tenants
PATCH  /tenants/:id
PATCH  /tenants/:id/assign
DELETE /tenants/:id
```

Assignment maps a tenant to a property.

## Leases

```text
GET    /leases
GET    /leases/expiring
GET    /leases/:id
POST   /leases
PATCH  /leases/:id
PATCH  /leases/:id/renew
DELETE /leases/:id
```

Tracks active leases, expiring leases, and renewal workflows.

## Payments

```text
GET    /payments
GET    /payments/due-reminders
GET    /payments/:id
POST   /payments
PATCH  /payments/:id
PATCH  /payments/:id/mark-paid
DELETE /payments/:id
```

Tracks payment status, method, due date, paid date, and reminders.

## Maintenance

```text
GET    /maintenance
GET    /maintenance/:id
POST   /maintenance
PATCH  /maintenance/:id
PATCH  /maintenance/:id/assign
PATCH  /maintenance/:id/status
POST   /maintenance/:id/attachments
DELETE /maintenance/:id
```

Supports ticket assignment, status workflow, priorities, and file upload endpoint.

## Notifications

```text
GET    /notifications
GET    /notifications/unread-count
POST   /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
DELETE /notifications/:id
```

Notifications are scoped to the authenticated user for read/delete actions.

## Pagination Contract

List endpoints accept:

```text
page
limit
search
sortBy
sortOrder=asc|desc
```

Response shape:

```json
{
  "success": true,
  "data": {
    "data": [],
    "meta": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    }
  },
  "timestamp": "2026-05-25T00:00:00.000Z"
}
```

## Error Contract

Errors return:

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
