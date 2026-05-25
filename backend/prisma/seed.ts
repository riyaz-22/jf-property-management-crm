import { PrismaPg } from '@prisma/adapter-pg';
import {
  ActivityType,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  PropertyStatus,
  PropertyType,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg(
  process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/jf_property_crm?schema=public',
);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jfcrm.local' },
    update: {},
    create: {
      email: 'admin@jfcrm.local',
      passwordHash,
      firstName: 'Riyaz',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      phone: '+44 20 7946 0100',
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'alexander.thorne@jfcrm.local' },
    update: {},
    create: {
      email: 'alexander.thorne@jfcrm.local',
      passwordHash,
      firstName: 'Alexander',
      lastName: 'Thorne',
      role: Role.PROPERTY_MANAGER,
      phone: '+44 7700 900 456',
    },
  });

  const glassHouse = await prisma.property.upsert({
    where: { reference: 'JF-GU5-001' },
    update: {},
    create: {
      reference: 'JF-GU5-001',
      title: 'The Glass House',
      type: PropertyType.HOUSE,
      status: PropertyStatus.OCCUPIED,
      addressLine1: '14 Cheltenham Place',
      city: 'Wilmslow',
      postcode: 'SK9 4AA',
      bedrooms: 5,
      bathrooms: 4,
      rentAmount: 4200,
      depositAmount: 8400,
      askingPrice: 4000000,
      ownerName: 'Marcus Sterling',
      ownerEmail: 'sterling@marcus.io',
      managerId: agent.id,
    },
  });

  const loft = await prisma.property.upsert({
    where: { reference: 'JF-MCR-014' },
    update: {},
    create: {
      reference: 'JF-MCR-014',
      title: 'Skyline Loft',
      type: PropertyType.FLAT,
      status: PropertyStatus.AVAILABLE,
      addressLine1: '21 Deansgate',
      city: 'Manchester',
      postcode: 'M3 2BW',
      bedrooms: 2,
      bathrooms: 2,
      rentAmount: 2150,
      depositAmount: 4300,
      ownerName: 'Julianne de Luca',
      ownerEmail: 'julianne@deluca.com',
      managerId: agent.id,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { email: 'victoria.sterling@example.com' },
    update: {},
    create: {
      firstName: 'Victoria',
      lastName: 'Sterling',
      email: 'victoria.sterling@example.com',
      phone: '+44 20 7946 0123',
      currentPropertyId: glassHouse.id,
      status: 'ACTIVE',
    },
  });

  const lease = await prisma.lease.create({
    data: {
      propertyId: glassHouse.id,
      tenantId: tenant.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      rentAmount: 4200,
      depositAmount: 8400,
      status: LeaseStatus.ACTIVE,
      signedAt: new Date('2025-12-15'),
      notes: 'Prime listing tenancy with annual renewal review.',
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        reference: 'PAY-2026-0001',
        propertyId: glassHouse.id,
        tenantId: tenant.id,
        leaseId: lease.id,
        amount: 4200,
        dueDate: new Date('2026-05-01'),
        paidAt: new Date('2026-05-02'),
        status: PaymentStatus.PAID,
        method: PaymentMethod.BANK_TRANSFER,
      },
      {
        reference: 'PAY-2026-0002',
        propertyId: glassHouse.id,
        tenantId: tenant.id,
        leaseId: lease.id,
        amount: 4200,
        dueDate: new Date('2026-06-01'),
        status: PaymentStatus.PENDING,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.maintenanceTicket.createMany({
    data: [
      {
        propertyId: glassHouse.id,
        tenantId: tenant.id,
        assigneeId: agent.id,
        title: 'Kitchen extractor service',
        description: 'Vendor reported noise during valuation follow-up.',
        priority: MaintenancePriority.MEDIUM,
        status: MaintenanceStatus.ASSIGNED,
        dueDate: new Date('2026-05-29'),
      },
      {
        propertyId: loft.id,
        title: 'Pre-let safety inspection',
        description: 'Schedule gas and electrical inspection before listing push.',
        priority: MaintenancePriority.HIGH,
        status: MaintenanceStatus.OPEN,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: 'Lease renewal window',
        message: 'The Glass House lease needs renewal review inside 60 days.',
        type: NotificationType.TASK,
        link: '/leases',
      },
      {
        userId: admin.id,
        title: 'Payment reminder ready',
        message: 'June rent reminder is queued for Victoria Sterling.',
        type: NotificationType.INFO,
        link: '/payments',
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      {
        userId: agent.id,
        propertyId: glassHouse.id,
        type: ActivityType.PROPERTY,
        title: 'Valuation booked',
        message: 'Alexander Thorne scheduled a property valuation appointment.',
      },
      {
        userId: admin.id,
        propertyId: glassHouse.id,
        type: ActivityType.PAYMENT,
        title: 'Rent received',
        message: 'May rent payment was reconciled.',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
