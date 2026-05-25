# Database Documentation

Database: PostgreSQL  
ORM: Prisma  
Schema: `backend/prisma/schema.prisma`

## Startup Validation

`DatabaseBootstrapService` runs on backend startup and:

- Verifies PostgreSQL connection with `SELECT 1`.
- Verifies `_prisma_migrations` exists.
- Fails startup if repository migrations are pending or incomplete.
- Ensures required role enum values exist.
- Upserts required internal users without deleting or resetting existing data.

## Seed Strategy

`backend/prisma/seed.ts`:

- Always upserts required system users.
- Uses bcrypt password hashing.
- Preserves existing data.
- Does not truncate or reset tables.
- Only inserts demo CRM data when `SEED_DEMO_DATA=true`.

Required system users:

| Email | Role | Password |
| --- | --- | --- |
| `admin@jfcrm.local` | `ADMIN` | `Password123!` |
| `manager@jfcrm.local` | `MANAGER` | `Password123!` |
| `admin@jfcrm.com` | `ADMIN` | `Password123!` |
| `manager@jfcrm.com` | `MANAGER` | `Password123!` |

## Enums

`Role`: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, `AGENT`, `ACCOUNTANT`, `MAINTENANCE`, `VIEWER`

`PropertyStatus`: `DRAFT`, `AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`, `SOLD`, `ARCHIVED`

`PropertyType`: `FLAT`, `HOUSE`, `TOWNHOUSE`, `COMMERCIAL`, `LAND`

`LeaseStatus`: `DRAFT`, `ACTIVE`, `EXPIRING`, `RENEWED`, `TERMINATED`

`PaymentStatus`: `PENDING`, `PAID`, `PARTIAL`, `OVERDUE`, `FAILED`, `REFUNDED`

`PaymentMethod`: `CASH`, `BANK_TRANSFER`, `CARD`, `DIRECT_DEBIT`

`MaintenanceStatus`: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_TENANT`, `COMPLETED`, `CANCELLED`

`MaintenancePriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

`NotificationType`: `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `TASK`

`ActivityType`: `SYSTEM`, `PROPERTY`, `TENANT`, `LEASE`, `PAYMENT`, `MAINTENANCE`, `AUTH`

## Tables

### User

Purpose: CRM user accounts, RBAC role assignment, active/deleted account state.

Important columns:
- `email` unique
- `passwordHash`
- `firstName`, `lastName`, `phone`, `avatarUrl`
- `role` default `STAFF`
- `isActive`, `lastLoginAt`, `deletedAt`

Relationships:
- One user has many refresh tokens, password reset tokens, notifications, activities.
- One user can manage many properties via `Property.managerId`.
- One user can be assigned many maintenance tickets via `MaintenanceTicket.assigneeId`.

Indexes:
- `role`
- `deletedAt`

Soft delete: `deletedAt`; user deactivation also sets `isActive=false`.

### RefreshToken

Purpose: hashed opaque refresh-token storage with rotation.

Important columns:
- `tokenHash` unique
- `userId`
- `expiresAt`
- `revokedAt`
- `replacedByTokenId`
- IP metadata

Relationships:
- Belongs to `User`, cascades on user delete.

Indexes:
- `userId`
- `expiresAt`
- `revokedAt`

Soft delete: none; uses revocation and expiry.

### PasswordResetToken

Purpose: password reset tokens.

Important columns:
- `tokenHash` unique
- `userId`
- `expiresAt`
- `usedAt`

Relationships:
- Belongs to `User`, cascades on user delete.

Indexes:
- `userId`
- `expiresAt`

### Property

Purpose: property inventory and owner/manager metadata.

Important columns:
- `reference` unique
- `title`, `type`, `status`
- address fields, `city`, `postcode`, `country`
- bedrooms, bathrooms
- `rentAmount`, `depositAmount`, `askingPrice`
- owner details
- `managerId`
- `deletedAt`

Relationships:
- Optional manager `User`.
- Has many tenants, leases, payments, maintenance tickets, activities.

Indexes:
- `status`
- `city`
- `postcode`
- `managerId`
- `deletedAt`

Soft delete: `deletedAt`.

### Tenant

Purpose: tenant records and current property assignment.

Important columns:
- `email` unique
- first/last name, phone
- `dateOfBirth`
- `status`
- `currentPropertyId`
- `deletedAt`

Relationships:
- Optional current `Property`.
- Has many leases, payments, maintenance tickets.

Indexes:
- `currentPropertyId`
- `status`
- `deletedAt`

Soft delete: `deletedAt`.

### Lease

Purpose: lease lifecycle between property and tenant.

Important columns:
- `propertyId`, `tenantId`
- `startDate`, `endDate`
- `rentAmount`, `depositAmount`
- `status`
- `renewalOfferedAt`, `signedAt`, `terminatedAt`
- `notes`, `deletedAt`

Relationships:
- Required `Property`.
- Required `Tenant`.
- Has many payments.

Indexes:
- `propertyId`
- `tenantId`
- `status`
- `endDate`
- `deletedAt`

Soft delete: `deletedAt`.

### Payment

Purpose: rent/payment tracking.

Important columns:
- `reference` unique
- `propertyId`, `tenantId`, optional `leaseId`
- `amount`
- `dueDate`, `paidAt`
- `status`, `method`
- `notes`, `deletedAt`

Relationships:
- Required `Property`.
- Required `Tenant`.
- Optional `Lease`.

Indexes:
- `propertyId`
- `tenantId`
- `leaseId`
- `status`
- `dueDate`
- `deletedAt`

Soft delete: `deletedAt`.

### MaintenanceTicket

Purpose: maintenance workflow tickets.

Important columns:
- `propertyId`
- optional `tenantId`
- optional `assigneeId`
- `title`, `description`
- `priority`, `status`
- `dueDate`, `completedAt`
- `cost`, `attachmentUrl`
- `deletedAt`

Relationships:
- Required `Property`.
- Optional `Tenant`.
- Optional assignee `User`.

Indexes:
- `propertyId`
- `tenantId`
- `assigneeId`
- `status`
- `priority`
- `deletedAt`

Soft delete: `deletedAt`.

### Notification

Purpose: user-scoped alerts and task notifications.

Important columns:
- `userId`
- `title`, `message`
- `type`
- optional `link`
- `readAt`
- `deletedAt`

Relationships:
- Required `User`, cascades on user delete.

Indexes:
- `userId`
- `readAt`
- `deletedAt`

Soft delete: `deletedAt`.

### Activity

Purpose: dashboard activity feed.

Important columns:
- optional `userId`
- optional `propertyId`
- `type`
- `title`, `message`
- optional JSON `metadata`
- `createdAt`

Relationships:
- Optional `User`.
- Optional `Property`.

Indexes:
- `userId`
- `propertyId`
- `type`
- `createdAt`

Soft delete: none in current schema.

## Not Implemented as Tables

- `Unit`: not present. Property inventory is modeled directly as `Property`.
- `ActivityLog`: not present. Activity feed uses the `Activity` model.
- AI chat messages/history: not persisted in current schema.
