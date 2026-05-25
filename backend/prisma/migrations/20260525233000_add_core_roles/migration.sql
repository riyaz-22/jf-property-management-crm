-- Add required enterprise CRM roles without touching existing users or data.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';
