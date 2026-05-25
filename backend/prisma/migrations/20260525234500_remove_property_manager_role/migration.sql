-- Remove the legacy PROPERTY_MANAGER role after safely migrating existing users.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

UPDATE "User"
SET "role" = 'MANAGER'
WHERE "role" = 'PROPERTY_MANAGER';

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'STAFF',
  'AGENT',
  'ACCOUNTANT',
  'MAINTENANCE',
  'VIEWER'
);

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING "role"::text::"Role";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';

DROP TYPE "Role_old";
