# Database Schema Design

Database: PostgreSQL only.

ORM: Prisma.

Primary schema file:

```text
backend/prisma/schema.prisma
```

Initial migration:

```text
backend/prisma/migrations/20260525190000_init/migration.sql
```

## Design Goals

- Normalize core CRM entities into relational tables.
- Use foreign keys for ownership and workflow relationships.
- Use enums for constrained lifecycle states.
- Use timestamps on mutable tables.
- Use `deletedAt` soft delete support for business entities.
- Add indexes for search/filter-heavy columns.
- Keep refresh tokens and password reset tokens hashed.

## Main Models

`User`

Stores CRM users and RBAC roles. Related to refresh tokens, reset tokens, managed properties, assigned maintenance tickets, notifications, and activities.

`RefreshToken`

Stores hashed refresh tokens with expiry, revocation, replacement token id, and IP metadata for rotation/invalidation.

`PasswordResetToken`

Stores hashed password reset tokens with expiry and `usedAt`.

`Property`

Stores property inventory, owner details, valuation/rent figures, status, manager relationship, and links to tenants, leases, payments, tickets, and activity.

`Tenant`

Stores tenant contact/status data and optional current property assignment.

`Lease`

Stores property/tenant lease lifecycle, rent/deposit, renewal, signed, terminated, and expiry tracking.

`Payment`

Stores rent/payment transactions, status, method, due date, paid date, lease linkage, and property/tenant linkage.

`MaintenanceTicket`

Stores maintenance workflow tickets with property, optional tenant, optional assignee, priority, status, cost, due date, completion date, and attachment URL.

`Notification`

Stores user alerts with type, read state, optional link, and soft delete.

`Activity`

Stores timeline entries linked optionally to users and properties.

## Enums

- `Role`
- `PropertyStatus`
- `PropertyType`
- `LeaseStatus`
- `PaymentStatus`
- `PaymentMethod`
- `MaintenanceStatus`
- `MaintenancePriority`
- `NotificationType`
- `ActivityType`

## Indexing

Indexes are included for:

- Soft delete fields: `deletedAt`
- Lifecycle filters: `status`, `priority`, `role`
- Date filters: `expiresAt`, `endDate`, `dueDate`, `createdAt`
- Foreign keys: `userId`, `propertyId`, `tenantId`, `leaseId`, `managerId`, `assigneeId`
- Property search/filter fields: `city`, `postcode`

## Soft Deletes

The following use `deletedAt`:

- `User`
- `Property`
- `Tenant`
- `Lease`
- `Payment`
- `MaintenanceTicket`
- `Notification`

Auth token tables are not soft deleted; they use expiry/revocation fields.
