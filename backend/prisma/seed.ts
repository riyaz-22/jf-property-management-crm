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

const password = 'Password123!';

const ensureSystemUser = async ({
  email,
  firstName,
  lastName,
  role,
  phone,
}: {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string;
}) => {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      role,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      phone,
    },
  });
};

const propertySeed = [
  ['JF-GU5-001', 'The Glass House', PropertyType.HOUSE, PropertyStatus.OCCUPIED, '14 Cheltenham Place', 'Wilmslow', 'SK9 4AA', 5, 4, 4200, 8400, 4000000, 'Marcus Sterling', 'sterling@marcus.io'],
  ['JF-MCR-014', 'Skyline Loft', PropertyType.FLAT, PropertyStatus.AVAILABLE, '21 Deansgate', 'Manchester', 'M3 2BW', 2, 2, 2150, 4300, 875000, 'Julianne de Luca', 'julianne@deluca.com'],
  ['JF-NW1-008', "Regent's Park Crescent", PropertyType.TOWNHOUSE, PropertyStatus.UNDER_MAINTENANCE, "18 Regent's Park Crescent", 'London', 'NW1 7EE', 4, 3, 6800, 13600, 3250000, 'Dr. Alistair Vaughn', 'a.vaughn@harley.co.uk'],
  ['JF-SW1-023', 'Belgravia Mews House', PropertyType.HOUSE, PropertyStatus.OCCUPIED, '7 Eaton Mews', 'London', 'SW1W 9ET', 3, 3, 5900, 11800, 2850000, 'Victoria Sterling', 'v.sterling@premium.com'],
  ['JF-W8-019', 'Kensington Garden Flat', PropertyType.FLAT, PropertyStatus.OCCUPIED, '42 Lexham Gardens', 'London', 'W8 5JE', 2, 1, 3100, 6200, 1100000, 'Elena Rodriguez', 'erod@globalassets.co'],
  ['JF-BS1-006', 'Harbourside Quarter', PropertyType.FLAT, PropertyStatus.AVAILABLE, '61 Welsh Back', 'Bristol', 'BS1 4SP', 2, 2, 1850, 3700, 610000, 'Harbourside Assets Ltd', 'ops@harboursideassets.co.uk'],
  ['JF-LS1-011', 'Victoria Gate Residence', PropertyType.FLAT, PropertyStatus.OCCUPIED, '12 George Street', 'Leeds', 'LS1 3DL', 1, 1, 1250, 2500, 395000, 'North Star Holdings', 'leasing@northstar.co.uk'],
  ['JF-EH3-017', 'New Town Townhouse', PropertyType.TOWNHOUSE, PropertyStatus.OCCUPIED, '9 Great King Street', 'Edinburgh', 'EH3 6QW', 4, 2, 3600, 7200, 1450000, 'Caledonian Homes', 'hello@caledonianhomes.co.uk'],
  ['JF-CB2-004', 'Cambridge Riverside', PropertyType.HOUSE, PropertyStatus.AVAILABLE, '3 Mill Lane', 'Cambridge', 'CB2 1RX', 3, 2, 2750, 5500, 925000, 'Academic Estates LLP', 'portfolio@academicestates.co.uk'],
  ['JF-G12-021', 'West End Studio', PropertyType.FLAT, PropertyStatus.OCCUPIED, '88 Byres Road', 'Glasgow', 'G12 8TB', 1, 1, 980, 1960, 285000, 'Clyde Property Group', 'rentals@clydeproperty.group'],
  ['JF-B1-031', 'Mailbox Penthouse', PropertyType.FLAT, PropertyStatus.SOLD, '16 Wharfside Street', 'Birmingham', 'B1 1RD', 3, 2, 2950, 5900, 1180000, 'Midlands Prime Ltd', 'sales@midlandsprime.co.uk'],
] as const;

const tenantSeed = [
  ['Victoria', 'Sterling', 'victoria.sterling@example.com', '+44 20 7946 0123', 'JF-GU5-001'],
  ['Noah', 'Patel', 'noah.patel@example.com', '+44 7700 900 101', 'JF-SW1-023'],
  ['Ava', 'Campbell', 'ava.campbell@example.com', '+44 7700 900 102', 'JF-W8-019'],
  ['Oliver', 'Reed', 'oliver.reed@example.com', '+44 7700 900 103', 'JF-LS1-011'],
  ['Maya', 'Hughes', 'maya.hughes@example.com', '+44 7700 900 104', 'JF-EH3-017'],
  ['Theo', 'Morgan', 'theo.morgan@example.com', '+44 7700 900 105', 'JF-G12-021'],
  ['Imogen', 'Watts', 'imogen.watts@example.com', '+44 7700 900 106', 'JF-NW1-008'],
  ['Freddie', 'King', 'freddie.king@example.com', '+44 7700 900 107', 'JF-MCR-014'],
  ['Sofia', 'Bennett', 'sofia.bennett@example.com', '+44 7700 900 108', 'JF-CB2-004'],
  ['Ethan', 'Brooks', 'ethan.brooks@example.com', '+44 7700 900 109', 'JF-BS1-006'],
  ['Lena', 'Ahmed', 'lena.ahmed@example.com', '+44 7700 900 110', 'JF-B1-031'],
  ['Daniel', 'Foster', 'daniel.foster@example.com', '+44 7700 900 111', 'JF-GU5-001'],
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  await ensureSystemUser({
    email: 'admin@jfcrm.com',
    firstName: 'Riyaz',
    lastName: 'Admin',
    role: Role.ADMIN,
    phone: '+44 20 7946 0100',
  });

  await ensureSystemUser({
    email: 'manager@jfcrm.com',
    firstName: 'Morgan',
    lastName: 'Manager',
    role: Role.MANAGER,
    phone: '+44 20 7946 0101',
  });

  await ensureSystemUser({
    email: 'admin@jfcrm.local',
    firstName: 'Riyaz',
    lastName: 'Admin',
    role: Role.ADMIN,
    phone: '+44 20 7946 0100',
  });

  await ensureSystemUser({
    email: 'manager@jfcrm.local',
    firstName: 'Morgan',
    lastName: 'Manager',
    role: Role.MANAGER,
    phone: '+44 20 7946 0101',
  });

  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jfcrm.com' },
    update: { passwordHash, role: Role.SUPER_ADMIN, isActive: true },
    create: {
      email: 'admin@jfcrm.com',
      passwordHash,
      firstName: 'Riyaz',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      phone: '+44 20 7946 0100',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@jfcrm.com' },
    update: { passwordHash, role: Role.MANAGER, isActive: true },
    create: {
      email: 'manager@jfcrm.com',
      passwordHash,
      firstName: 'Alexander',
      lastName: 'Thorne',
      role: Role.MANAGER,
      phone: '+44 7700 900 456',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accounts@jfcrm.com' },
    update: { passwordHash, role: Role.ACCOUNTANT, isActive: true },
    create: {
      email: 'accounts@jfcrm.com',
      passwordHash,
      firstName: 'Amelia',
      lastName: 'Brooks',
      role: Role.ACCOUNTANT,
      phone: '+44 7700 900 223',
    },
  });

  const maintenanceUser = await prisma.user.upsert({
    where: { email: 'maintenance@jfcrm.com' },
    update: { passwordHash, role: Role.MAINTENANCE, isActive: true },
    create: {
      email: 'maintenance@jfcrm.com',
      passwordHash,
      firstName: 'Sam',
      lastName: 'Carter',
      role: Role.MAINTENANCE,
      phone: '+44 7700 900 224',
    },
  });

  const properties = new Map<string, Awaited<ReturnType<typeof prisma.property.upsert>>>();

  for (const [
    reference,
    title,
    type,
    status,
    addressLine1,
    city,
    postcode,
    bedrooms,
    bathrooms,
    rentAmount,
    depositAmount,
    askingPrice,
    ownerName,
    ownerEmail,
  ] of propertySeed) {
    const property = await prisma.property.upsert({
      where: { reference },
      update: {
        title,
        type,
        status,
        addressLine1,
        city,
        postcode,
        bedrooms,
        bathrooms,
        rentAmount,
        depositAmount,
        askingPrice,
        ownerName,
        ownerEmail,
        managerId: manager.id,
        deletedAt: null,
      },
      create: {
        reference,
        title,
        type,
        status,
        addressLine1,
        city,
        postcode,
        bedrooms,
        bathrooms,
        rentAmount,
        depositAmount,
        askingPrice,
        ownerName,
        ownerEmail,
        managerId: manager.id,
      },
    });
    properties.set(reference, property);
  }

  const tenants: Array<{
    tenant: Awaited<ReturnType<typeof prisma.tenant.upsert>>;
    property: Awaited<ReturnType<typeof prisma.property.upsert>> | undefined;
  }> = [];

  for (const [firstName, lastName, email, phone, propertyReference] of tenantSeed) {
    const property = properties.get(propertyReference);
    const tenant = await prisma.tenant.upsert({
      where: { email },
      update: {
        firstName,
        lastName,
        phone,
        currentPropertyId: property?.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
      create: {
        firstName,
        lastName,
        email,
        phone,
        currentPropertyId: property?.id,
        status: 'ACTIVE',
      },
    });
    tenants.push({ tenant, property });
  }

  const leases: Array<{
    lease: Awaited<ReturnType<typeof prisma.lease.create>>;
    tenant: Awaited<ReturnType<typeof prisma.tenant.upsert>>;
    property: Awaited<ReturnType<typeof prisma.property.upsert>>;
  }> = [];
  for (let index = 0; index < tenants.length; index += 1) {
    const { tenant, property } = tenants[index];
    if (!property || property.status === PropertyStatus.SOLD) {
      continue;
    }

    const existingLease = await prisma.lease.findFirst({
      where: {
        propertyId: property.id,
        tenantId: tenant.id,
        deletedAt: null,
      },
    });

    const startDate = new Date(2026, index % 5, 1);
    const endDate = new Date(2026 + (index % 2), (index % 12), 28);

    const lease =
      existingLease ??
      (await prisma.lease.create({
        data: {
          propertyId: property.id,
          tenantId: tenant.id,
          startDate,
          endDate,
          rentAmount: property.rentAmount,
          depositAmount: property.depositAmount,
          status: index % 4 === 0 ? LeaseStatus.EXPIRING : LeaseStatus.ACTIVE,
          signedAt: new Date(startDate.getTime() - 1000 * 60 * 60 * 24 * 14),
          notes: 'Seeded lease relationship for CRM evaluation.',
        },
      }));

    leases.push({ lease, tenant, property });
  }

  const paymentMonths = [0, 1, 2, 3, 4, 5];
  for (const { lease, tenant, property } of leases) {
    for (const month of paymentMonths) {
      const dueDate = new Date(2026, month, 1);
      const isPaid = month <= 4;
      const reference = `PAY-${property.reference}-${String(month + 1).padStart(2, '0')}`;

      await prisma.payment.upsert({
        where: { reference },
        update: {
          amount: lease.rentAmount,
          dueDate,
          paidAt: isPaid ? new Date(2026, month, 2) : null,
          status: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          method: isPaid ? PaymentMethod.BANK_TRANSFER : null,
          deletedAt: null,
        },
        create: {
          reference,
          propertyId: property.id,
          tenantId: tenant.id,
          leaseId: lease.id,
          amount: lease.rentAmount,
          dueDate,
          paidAt: isPaid ? new Date(2026, month, 2) : null,
          status: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          method: isPaid ? PaymentMethod.BANK_TRANSFER : null,
        },
      });
    }
  }

  const ticketSeed = [
    ['Kitchen extractor service', 'Vendor reported noise during valuation follow-up.', 'JF-GU5-001', 'victoria.sterling@example.com', MaintenancePriority.MEDIUM, MaintenanceStatus.ASSIGNED],
    ['Pre-let safety inspection', 'Schedule gas and electrical inspection before listing push.', 'JF-MCR-014', 'freddie.king@example.com', MaintenancePriority.HIGH, MaintenanceStatus.OPEN],
    ['Boiler pressure loss', 'Tenant reports intermittent hot water pressure drops.', 'JF-SW1-023', 'noah.patel@example.com', MaintenancePriority.URGENT, MaintenanceStatus.IN_PROGRESS],
    ['Garden wall repair', 'Brickwork on side return requires contractor quote.', 'JF-EH3-017', 'maya.hughes@example.com', MaintenancePriority.MEDIUM, MaintenanceStatus.WAITING_TENANT],
    ['Smoke alarm replacement', 'Annual inspection flagged one expired alarm.', 'JF-LS1-011', 'oliver.reed@example.com', MaintenancePriority.HIGH, MaintenanceStatus.COMPLETED],
    ['Window seal inspection', 'Condensation reported in main bedroom glazing.', 'JF-W8-019', 'ava.campbell@example.com', MaintenancePriority.LOW, MaintenanceStatus.OPEN],
  ] as const;

  for (const [title, description, propertyReference, tenantEmail, priority, status] of ticketSeed) {
    const property = properties.get(propertyReference);
    const tenant = await prisma.tenant.findUnique({ where: { email: tenantEmail } });

    if (!property) {
      continue;
    }

    const existingTicket = await prisma.maintenanceTicket.findFirst({
      where: { title, propertyId: property.id, deletedAt: null },
    });

    if (!existingTicket) {
      await prisma.maintenanceTicket.create({
        data: {
          propertyId: property.id,
          tenantId: tenant?.id,
          assigneeId: status === MaintenanceStatus.OPEN ? null : maintenanceUser.id,
          title,
          description,
          priority,
          status,
          dueDate: new Date(2026, 4, 28 + ticketSeed.findIndex((item) => item[0] === title)),
          completedAt: status === MaintenanceStatus.COMPLETED ? new Date(2026, 4, 20) : null,
        },
      });
    }
  }

  const notificationSeed = [
    ['Lease renewal window', 'The Glass House lease needs renewal review inside 60 days.', NotificationType.TASK, '/leases'],
    ['Payment reminder ready', 'June rent reminders are queued for active tenants.', NotificationType.INFO, '/payments'],
    ['Maintenance SLA risk', 'Urgent maintenance tickets need same-day acknowledgement.', NotificationType.WARNING, '/maintenance'],
  ] as const;

  for (const [title, message, type, link] of notificationSeed) {
    const existingNotification = await prisma.notification.findFirst({
      where: { userId: admin.id, title, deletedAt: null },
    });

    if (!existingNotification) {
      await prisma.notification.create({
        data: { userId: admin.id, title, message, type, link },
      });
    }
  }

  const activitySeed = [
    ['Valuation booked', 'Alexander Thorne scheduled a property valuation appointment.', ActivityType.PROPERTY, 'JF-GU5-001', manager.id],
    ['Rent received', 'May rent payment was reconciled by accounts.', ActivityType.PAYMENT, 'JF-SW1-023', accountant.id],
    ['Maintenance assigned', 'Boiler pressure ticket assigned to maintenance team.', ActivityType.MAINTENANCE, 'JF-SW1-023', maintenanceUser.id],
    ['Lease renewed', "Lease renewal offer prepared for Regent's Park Crescent.", ActivityType.LEASE, 'JF-NW1-008', manager.id],
  ] as const;

  for (const [title, message, type, propertyReference, userId] of activitySeed) {
    const property = properties.get(propertyReference);
    const existingActivity = await prisma.activity.findFirst({
      where: { title, propertyId: property?.id },
    });

    if (!existingActivity) {
      await prisma.activity.create({
        data: {
          userId,
          propertyId: property?.id,
          type,
          title,
          message,
        },
      });
    }
  }
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
