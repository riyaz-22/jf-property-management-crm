# Assumptions and Technical Considerations

## Assumptions

- The repository is the submission source code repository.
- PostgreSQL is the only database target.
- JWT authentication is implemented even though the prompt allows it to be optional for a demo.
- The screenshots represent the most important UI workflow: contact directory, contact detail, sell intent workspace, and valuation scheduling.
- The existing frontend architecture was mostly an empty scaffold with intended folders, so the implementation reused those folder names and filled the missing modules.
- Email delivery for password reset is not wired to an SMTP provider; the backend creates a reset token and returns it for demo/evaluation.
- File upload stores an attachment URL placeholder. Production storage would use S3, Azure Blob, local storage with static serving, or another configured asset store.
- The frontend includes demo fallback data so evaluators can inspect the UI before starting PostgreSQL/backend services.

## Technical Considerations

### Architecture

- Backend uses one Nest module per major CRM domain.
- Common backend concerns live in `src/common`: decorators, guards, filters, interceptors, pagination.
- Prisma is global through `PrismaModule`.
- Frontend uses feature modules under `src/modules`.
- Reusable UI primitives live in `src/components/ui`.
- API communication is centralized in `src/services`.

### Authentication

- Access token: JWT bearer token.
- Refresh token: opaque random token, hashed before database storage.
- Refresh rotation: old refresh token is revoked and linked to a replacement.
- RBAC: roles are stored on `User.role` and checked with `@Roles`.
- Frontend session persistence: Zustand + localStorage.
- Axios interceptors attach bearer tokens and attempt refresh once on `401`.

### Validation and Error Handling

- Backend DTOs use `class-validator` and global `ValidationPipe`.
- Backend strips unknown fields with `whitelist`.
- A global exception filter normalizes API errors.
- A global response interceptor wraps successful responses.
- Frontend forms use React Hook Form and Zod.

### Database Normalisation

- Property, tenant, lease, payment, maintenance, notification, activity, and user concerns are separate models.
- Join relationships use foreign keys rather than duplicated denormalized data.
- Business entities support soft delete through `deletedAt`.
- Token tables use expiry/revocation fields instead of soft delete.

### Performance

- List APIs use pagination.
- Prisma queries use filters and indexes for common lookup paths.
- Frontend server state uses TanStack Query caching.
- Vite build currently produces a large single bundle; route-level lazy loading would be a production optimization.

### UI/UX

- The app shell, sidebar, contact directory, drawer, detail page, sell intent workspace, and scheduler are built to closely follow the provided screenshots.
- The interface is responsive with mobile bottom navigation.
- UI controls use familiar icons from `lucide-react`.

### Production Gaps / Next Steps

- Add full e2e test coverage with a test PostgreSQL database.
- Add route-level code splitting.
- Add real email provider for reset password.
- Add production-grade upload storage.
- Add audit logs for all mutations.
- Add more granular permissions beyond role-level checks.
- Add OpenAPI examples for every DTO.
- Add CI pipeline for lint, build, tests, and migration validation.
