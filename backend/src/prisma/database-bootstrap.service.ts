import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaService } from './prisma.service';

const SYSTEM_PASSWORD = process.env.SYSTEM_USER_DEFAULT_PASSWORD ?? 'Password123!';

const requiredUsers = [
  {
    email: 'admin@jfcrm.com',
    firstName: 'Riyaz',
    lastName: 'Admin',
    phone: '+44 20 7946 0100',
    role: Role.ADMIN,
  },
  {
    email: 'manager@jfcrm.com',
    firstName: 'Morgan',
    lastName: 'Manager',
    phone: '+44 20 7946 0101',
    role: Role.MANAGER,
  },
  {
    email: 'admin@jfcrm.local',
    firstName: 'Riyaz',
    lastName: 'Admin',
    phone: '+44 20 7946 0100',
    role: Role.ADMIN,
  },
  {
    email: 'manager@jfcrm.local',
    firstName: 'Morgan',
    lastName: 'Manager',
    phone: '+44 20 7946 0101',
    role: Role.MANAGER,
  },
] as const;

const requiredRoleValues = ['ADMIN', 'MANAGER', 'STAFF'] as const;

@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.verifyConnection();
    await this.ensureRoleEnumValues();
    await this.verifyMigrations();
    await this.ensureRequiredUsers();
  }

  private async verifyConnection() {
    await this.prisma.$queryRaw`SELECT 1`;
    this.logger.log('PostgreSQL connection verified.');
  }

  private async ensureRoleEnumValues() {
    const rows = await this.prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = '"Role"'::regtype
    `;
    const existingRoles = new Set(rows.map((row) => row.enumlabel));

    for (const role of requiredRoleValues) {
      if (!existingRoles.has(role)) {
        await this.prisma.$executeRawUnsafe(
          `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS '${role}'`,
        );
        this.logger.warn(`Added missing role enum value: ${role}`);
      }
    }
  }

  private async verifyMigrations() {
    const migrationTable = await this.prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('_prisma_migrations')::text AS table_name
    `;

    if (!migrationTable[0]?.table_name) {
      throw new Error('Prisma migration table is missing. Run prisma migrate deploy before starting the backend.');
    }

    const failedMigrations = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NULL
        AND rolled_back_at IS NULL
    `;

    if (failedMigrations.length) {
      throw new Error(
        `Prisma migrations are incomplete: ${failedMigrations.map((row) => row.migration_name).join(', ')}`,
      );
    }

    const migrationsPath = join(process.cwd(), 'prisma', 'migrations');
    if (!existsSync(migrationsPath)) {
      this.logger.warn('Prisma migrations directory was not found during startup validation.');
      return;
    }

    const expectedMigrations = readdirSync(migrationsPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const appliedMigrations = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;
    const applied = new Set(appliedMigrations.map((row) => row.migration_name));
    const missing = expectedMigrations.filter((name) => !applied.has(name));

    if (missing.length) {
      throw new Error(
        `Prisma migrations are pending: ${missing.join(', ')}. Run prisma migrate deploy before starting the backend.`,
      );
    }

    this.logger.log('Prisma migrations verified.');
  }

  private async ensureRequiredUsers() {
    const passwordHash = await bcrypt.hash(SYSTEM_PASSWORD, 12);

    for (const user of requiredUsers) {
      await this.prisma.user.upsert({
        where: { email: user.email },
        update: {
          role: user.role,
          isActive: true,
          deletedAt: null,
        },
        create: {
          ...user,
          passwordHash,
        },
      });
    }

    this.logger.log('Required internal auth users verified.');
  }
}
