import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type Row = Record<string, unknown>;

const iso = (value: unknown, fallback?: Date) => {
  const date = value ? new Date(String(value)) : fallback;
  if (!date || Number.isNaN(date.getTime())) throw new BadRequestException('Use a valid appointment date.');
  return date;
};

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: Record<string, string>) {
    await this.ensureSeed();
    const start = query.start ? new Date(query.start) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 31);
    const end = query.end ? new Date(query.end) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 62);
    const rows = await this.prisma.$queryRawUnsafe<Row[]>(`
      SELECT a.*, 
        json_build_object('id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'email', u.email, 'role', u.role) AS agent,
        json_build_object('id', c.id, 'firstName', c."firstName", 'lastName', c."lastName", 'email', c.email, 'slug', c.slug) AS contact,
        json_build_object('id', p.id, 'reference', p.reference, 'title', p.title, 'addressLine1', p."addressLine1") AS property
      FROM "Appointment" a
      LEFT JOIN "User" u ON u.id = a."agentId"
      LEFT JOIN "Contact" c ON c.id = a."contactId"
      LEFT JOIN "Property" p ON p.id = a."propertyId"
      WHERE a."deletedAt" IS NULL AND a."startsAt" < $1 AND a."endsAt" > $2
      ORDER BY a."startsAt" ASC
    `, end, start);
    return { data: rows };
  }

  async create(body: Record<string, unknown>, userId?: string) {
    const startsAt = iso(body.startsAt);
    const durationMinutes = Number(body.durationMinutes ?? 60);
    const endsAt = iso(body.endsAt, new Date(startsAt.getTime() + durationMinutes * 60000));
    await this.assertNoOverlap(String(body.agentId ?? ''), startsAt, endsAt);
    const id = randomUUID();
    const title = String(body.title ?? 'Property valuation');
    const status = String(body.status ?? 'CONFIRMED');
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "Appointment" ("id","title","type","status","startsAt","endsAt","durationMinutes","agentId","propertyId","contactId","reference","location","notes","reminderAt","updatedAt")
      VALUES ($1,$2,$3::"AppointmentType",$4::"AppointmentStatus",$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
    `, id, title, String(body.type ?? 'VALUATION'), status, startsAt, endsAt, durationMinutes, body.agentId || null, body.propertyId || null, body.contactId || null, body.reference || null, body.location || null, body.notes || null, body.reminderAt ? new Date(String(body.reminderAt)) : null);
    await this.statusHistory(id, null, status, userId, 'Created');
    return this.findOne(id);
  }

  async update(id: string, body: Record<string, unknown>, userId?: string) {
    const current = await this.findOne(id);
    if (!current) throw new NotFoundException('Appointment not found');
    const startsAt = body.startsAt ? iso(body.startsAt) : new Date(String(current.startsAt));
    const durationMinutes = Number(body.durationMinutes ?? current.durationMinutes ?? 60);
    const endsAt = body.endsAt ? iso(body.endsAt) : new Date(startsAt.getTime() + durationMinutes * 60000);
    const agentId = String(body.agentId ?? current.agentId ?? '');
    await this.assertNoOverlap(agentId, startsAt, endsAt, id);
    const nextStatus = String(body.status ?? current.status);
    await this.prisma.$executeRawUnsafe(`
      UPDATE "Appointment" SET "title"=$2, "type"=$3::"AppointmentType", "status"=$4::"AppointmentStatus", "startsAt"=$5, "endsAt"=$6,
      "durationMinutes"=$7, "agentId"=$8, "propertyId"=$9, "contactId"=$10, "reference"=$11, "location"=$12, "notes"=$13, "reminderAt"=$14, "updatedAt"=NOW()
      WHERE "id"=$1 AND "deletedAt" IS NULL
    `, id, body.title ?? current.title, body.type ?? current.type, nextStatus, startsAt, endsAt, durationMinutes, body.agentId ?? current.agentId ?? null, body.propertyId ?? current.propertyId ?? null, body.contactId ?? current.contactId ?? null, body.reference ?? current.reference ?? null, body.location ?? current.location ?? null, body.notes ?? current.notes ?? null, body.reminderAt ? new Date(String(body.reminderAt)) : current.reminderAt ?? null);
    if (nextStatus !== current.status) await this.statusHistory(id, String(current.status), nextStatus, userId, 'Updated');
    return this.findOne(id);
  }

  async remove(id: string, userId?: string) {
    const current = await this.findOne(id);
    if (!current) throw new NotFoundException('Appointment not found');
    await this.prisma.$executeRawUnsafe('UPDATE "Appointment" SET "deletedAt"=NOW(), "status"=$2::"AppointmentStatus", "updatedAt"=NOW() WHERE "id"=$1', id, 'CANCELLED');
    await this.statusHistory(id, String(current.status), 'CANCELLED', userId, 'Deleted');
    return { id };
  }

  private async findOne(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<Row[]>('SELECT * FROM "Appointment" WHERE "id"=$1 AND "deletedAt" IS NULL LIMIT 1', id);
    return rows[0];
  }

  private async assertNoOverlap(agentId: string, startsAt: Date, endsAt: Date, ignoreId?: string) {
    if (!agentId) return;
    const rows = await this.prisma.$queryRawUnsafe<Row[]>('SELECT id FROM "Appointment" WHERE "agentId"=$1 AND "deletedAt" IS NULL AND "status" <> $2::"AppointmentStatus" AND "startsAt" < $3 AND "endsAt" > $4 AND ($5::text IS NULL OR id <> $5) LIMIT 1', agentId, 'CANCELLED', endsAt, startsAt, ignoreId ?? null);
    if (rows.length) throw new BadRequestException('This agent already has an appointment in that time slot.');
  }

  private async statusHistory(id: string, from: string | null, to: string, userId?: string, reason?: string) {
    await this.prisma.$executeRawUnsafe('INSERT INTO "AppointmentStatusHistory" ("id","appointmentId","fromStatus","toStatus","changedById","reason") VALUES ($1,$2,$3::"AppointmentStatus",$4::"AppointmentStatus",$5,$6)', randomUUID(), id, from, to, userId ?? null, reason ?? null);
  }

  private async ensureSeed() {
    const count = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM "Appointment" WHERE "deletedAt" IS NULL');
    if (Number(count[0]?.count ?? 0) > 0) return;
    const agent = await this.prisma.user.findFirst({ where: { deletedAt: null, isActive: true }, orderBy: { createdAt: 'asc' } });
    const contact = await this.prisma.contact.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
    const property = await this.prisma.property.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } });
    const start = new Date(); start.setHours(10, 0, 0, 0);
    await this.create({ title: 'Glass House valuation', startsAt: start.toISOString(), durationMinutes: 60, agentId: agent?.id, contactId: contact?.id, propertyId: property?.id, reference: property?.reference ?? 'VAL-001', notes: 'Seeded enterprise calendar appointment.' });
  }
}
