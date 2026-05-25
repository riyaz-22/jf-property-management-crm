# JF CRM Backend

NestJS backend for the JF Property Management CRM.

## Stack

- NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- JWT access tokens and refresh token rotation
- RBAC guards
- Swagger
- DTO validation

## Run

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Swagger:

```text
http://localhost:3000/docs
```

Seed login:

```text
admin@jfcrm.local
Password123!
```

## Scripts

```bash
npm run build
npm run start:dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
npm test
```

## Structure

```text
src/common       decorators, guards, filters, pagination, interceptors
src/modules      auth, users, dashboard, properties, tenants, leases, payments, maintenance, notifications
src/prisma       Prisma service/module
prisma/          schema, migrations, seed script
```
