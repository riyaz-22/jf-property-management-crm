import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ContactRole, PendingTone, Prisma } from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContactQueryDto,
  CreateContactDto,
  ScheduleValuationDto,
  UpdateAppointmentDto,
  UpdateChecklistItemDto,
  UpdateContactDto,
} from './dto/contact.dto';

const contactInclude = {
  assignedAgent: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true },
  },
  sellIntents: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { appointments: { orderBy: { scheduledAt: 'desc' as const }, take: 3 } },
  },
  aiInsights: { orderBy: { createdAt: 'asc' as const } },
  timeline: { orderBy: { occurredAt: 'desc' as const } },
  documents: { orderBy: { createdAt: 'desc' as const } },
  valuationAppointments: { orderBy: { scheduledAt: 'desc' as const }, take: 5 },
};

const contactSortFields = new Set([
  'firstName',
  'lastName',
  'email',
  'role',
  'city',
  'lastActivityAt',
  'createdAt',
  'updatedAt',
]);

const stages = [
  'Property Valuation',
  'Fee Structure',
  'Instruction Document',
  'Instruction Agreed',
  'Compliance & AML Pack Issued',
  'Vendor AML & Risk Assessment',
  'Add Property',
  'Publish Property',
  'Viewings & Buyer Engagement',
  'Offer Received',
  'Memorandum of Sale Issued',
  'Sales Progression (Post-Agreement)',
  'Exchange of Contracts',
  'Completion & Payment',
].map((label, index) => ({ label, completed: index < 2, active: index === 0 }));

const checklist = [
  'Run portal comparables (Rightmove / Zoopla)',
  'Check recent sold prices (Land Registry)',
  'Review local demand & stock levels',
  'Confirm tenure type (Freehold/Leasehold)',
  'Confirm access / key arrangements with vendor',
  'Note EPC requirement (needed before listing)',
  'Note any competing agents (if known)',
  'Agent preparation complete - ready to attend',
].map((label) => ({ label, completed: false }));

const roleLabelToEnum: Record<string, ContactRole> = {
  Purchaser: ContactRole.PURCHASER,
  Vendor: ContactRole.VENDOR,
  Tenant: ContactRole.TENANT,
  Landlord: ContactRole.LANDLORD,
  'Company / Vendor': ContactRole.COMPANY_VENDOR,
  'High Urgency': ContactRole.HIGH_URGENCY,
};

const demoContacts = [
  ['marcus-sterling', 'Marcus', 'Sterling', 'sterling@marcus.io', '+44 7700 900 456', 'Vendor', [], 'The Glass House, Surrey', 'Wilmslow', 'SK9 4AA', 'Site Visit: Surrey Estate', 'None Pending', PendingTone.NEUTRAL],
  ['victoria-sterling', 'Victoria', 'Sterling', 'v.sterling@premium.com', '+44 20 7946 0123', 'Purchaser', [], 'Belgravia, London SW1W', 'London', 'SW1W', 'Portfolio Review Call', 'Contract Renewal', PendingTone.DANGER],
  ['sterling-holdings', 'Sterling Real Estate', 'Holdings Ltd', 'corporate@sterling.io', 'Victoria Sterling (MD) · +44 20 7946 0123', 'Company / Vendor', [], 'The Glass House, Weybridge, Surrey, KT13', 'Weybridge', 'KT13', 'Onboarding & AML Audit', 'Corporate AML & Board Resolution', PendingTone.WARNING],
  ['julianne-deluca', 'Julianne', 'de Luca', 'julianne@deluca.com', '+44 7700 900 789', 'Tenant', ['Purchaser'], 'Skyline Loft, Manchester', 'Manchester', 'M3', 'Email: Mortgage Docs', 'Appraisal Scheduled', PendingTone.WARNING],
  ['alistair-vaughn', 'Dr. Alistair', 'Vaughn', 'a.vaughn@harley.co.uk', '+44 7700 900 888', 'Landlord', [], "Regent's Park Crescent, London NW1", 'London', 'NW1', 'Market Valuation Sent', 'None Pending', PendingTone.WARNING],
  ['elena-rodriguez', 'Elena', 'Rodriguez', 'erod@globalassets.co', '+44 7700 900 312', 'Tenant', ['High Urgency'], 'Kensington, London W8', 'London', 'W8', 'Email: Availability', '3 Tasks Pending', PendingTone.WARNING],
] as const;

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ContactQueryDto) {
    await this.ensureDemoContacts();
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.ContactWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search, mode: 'insensitive' } },
              { company: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { postcode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortBy = contactSortFields.has(query.sortBy) ? query.sortBy : 'lastActivityAt';
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        include: contactInclude,
        skip,
        take,
        orderBy: { [sortBy]: query.sortOrder },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    await this.ensureDemoContacts();
    const contact = await this.prisma.contact.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: contactInclude,
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async create(dto: CreateContactDto) {
    try {
      const email = dto.email.toLowerCase();
      await this.assertEmailAvailable(email);
      await this.assertAgentExists(dto.assignedAgentId);
      const contact = await this.prisma.contact.create({
        data: {
          ...this.contactData(dto),
          email,
          slug: await this.uniqueSlug(`${dto.firstName}-${dto.lastName}`),
          lastActivityAt: new Date(),
        } as Prisma.ContactUncheckedCreateInput,
        include: contactInclude,
      });
      await this.ensureSellIntent(contact.id, contact.firstName, contact.lastName);
      return this.findOne(contact.id);
    } catch (error) {
      this.handlePersistenceError(error, 'create contact');
    }
  }

  async update(idOrSlug: string, dto: UpdateContactDto) {
    try {
      const contact = await this.findOne(idOrSlug);
      if (dto.email && dto.email.toLowerCase() !== contact.email) {
        await this.assertEmailAvailable(dto.email.toLowerCase(), contact.id);
      }
      await this.assertAgentExists(dto.assignedAgentId);

      return this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          ...this.contactData(dto),
          ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
        },
        include: contactInclude,
      });
    } catch (error) {
      this.handlePersistenceError(error, 'update contact');
    }
  }

  async remove(idOrSlug: string) {
    const contact = await this.findOne(idOrSlug);
    return this.prisma.contact.update({
      where: { id: contact.id },
      data: { deletedAt: new Date() },
      include: contactInclude,
    });
  }

  async updateAvatar(idOrSlug: string, avatarUrl: string) {
    const contact = await this.findOne(idOrSlug);
    this.removeAvatarFile(contact.avatarUrl);
    return this.prisma.contact.update({
      where: { id: contact.id },
      data: { avatarUrl },
      include: contactInclude,
    });
  }

  async removeAvatar(idOrSlug: string) {
    const contact = await this.findOne(idOrSlug);
    this.removeAvatarFile(contact.avatarUrl);
    return this.prisma.contact.update({
      where: { id: contact.id },
      data: { avatarUrl: null },
      include: contactInclude,
    });
  }

  async getSellIntent(contactIdOrSlug: string) {
    const contact = await this.findOne(contactIdOrSlug);
    return this.ensureSellIntent(contact.id, contact.firstName, contact.lastName);
  }

  async updateChecklist(contactIdOrSlug: string, dto: UpdateChecklistItemDto) {
    const intent = await this.getSellIntent(contactIdOrSlug);
    const current = Array.isArray(intent.checklist) ? intent.checklist : checklist;
    const next = current.map((item) => {
      const row = item as { label: string; completed?: boolean };
      return row.label === dto.label ? { ...row, completed: Boolean(dto.completed) } : row;
    });
    const done = next.filter((item) => item.completed).length;
    return this.prisma.sellIntent.update({
      where: { id: intent.id },
      data: {
        checklist: next as Prisma.InputJsonValue,
        workflowProgress: Math.round((done / Math.max(next.length, 1)) * 100),
      },
      include: { appointments: true },
    });
  }

  async scheduleValuation(contactIdOrSlug: string, dto: ScheduleValuationDto) {
    try {
      const contact = await this.findOne(contactIdOrSlug);
      const intent = await this.ensureSellIntent(contact.id, contact.firstName, contact.lastName);
      const appointment = await this.prisma.valuationAppointment.create({
        data: {
          contactId: contact.id,
          sellIntentId: intent.id,
          agentId: dto.agentId || contact.assignedAgentId,
          scheduledAt: new Date(dto.scheduledAt),
          durationMinutes: dto.durationMinutes ?? 60,
          notes: dto.notes,
          competingAgents: dto.competingAgents,
        },
        include: { agent: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });

      await this.prisma.contactTimelineEntry.create({
        data: {
          contactId: contact.id,
          step: 'Property Valuation',
          activity: 'Valuation booked',
          description: `Property valuation visit scheduled for ${appointment.scheduledAt.toLocaleString('en-GB')}.`,
          agentName: contact.assignedAgent ? `${contact.assignedAgent.firstName} ${contact.assignedAgent.lastName}` : 'Alexander Thorne',
        },
      });

      return appointment;
    } catch (error) {
      this.handlePersistenceError(error, 'schedule valuation');
    }
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.valuationAppointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Valuation appointment not found');
    }
    return this.prisma.valuationAppointment.update({
      where: { id },
      data: {
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.agentId !== undefined ? { agentId: dto.agentId || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.competingAgents !== undefined ? { competingAgents: dto.competingAgents } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  private contactData(dto: Partial<CreateContactDto>) {
    return {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.mobile !== undefined ? { mobile: dto.mobile } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
      ...(dto.secondaryRoles !== undefined ? { secondaryRoles: dto.secondaryRoles } : {}),
      ...(dto.company !== undefined ? { company: dto.company } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.postcode !== undefined ? { postcode: dto.postcode } : {}),
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.assignedAgentId !== undefined ? { assignedAgentId: dto.assignedAgentId || null } : {}),
      ...(dto.lastActivityNote !== undefined ? { lastActivityNote: dto.lastActivityNote } : {}),
      ...(dto.pendingAction !== undefined ? { pendingAction: dto.pendingAction } : {}),
      ...(dto.pendingTone !== undefined ? { pendingTone: dto.pendingTone } : {}),
    };
  }

  private async assertEmailAvailable(email: string, ownId?: string) {
    const existing = await this.prisma.contact.findUnique({ where: { email } });
    if (existing && existing.id !== ownId) {
      throw new ConflictException('A contact with this email already exists');
    }
  }

  private async assertAgentExists(assignedAgentId?: string) {
    if (!assignedAgentId) {
      return;
    }

    const agent = await this.prisma.user.findFirst({
      where: { id: assignedAgentId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!agent) {
      throw new BadRequestException('Assigned agent was not found');
    }
  }

  private async uniqueSlug(name: string) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'contact';
    let slug = base;
    let count = 2;
    while (await this.prisma.contact.findUnique({ where: { slug } })) {
      slug = `${base}-${count}`;
      count += 1;
    }
    return slug;
  }

  private async ensureSellIntent(contactId: string, firstName: string, lastName: string) {
    const existing = await this.prisma.sellIntent.findFirst({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      include: { appointments: { orderBy: { scheduledAt: 'desc' } } },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.sellIntent.create({
      data: {
        contactId,
        askingPrice: new Prisma.Decimal(4000000),
        stages: stages as Prisma.InputJsonValue,
        checklist: checklist as Prisma.InputJsonValue,
        propertyInfo: {
          tenure: 'Freehold',
          bedrooms: 5,
          bathrooms: 4,
          vendor: `${firstName} ${lastName}`,
          address: '14 Cheltenham Place, Wilmslow, SK9 4AA',
        },
        nextActions: [
          { label: 'Add property to inventory', completed: false },
          { label: 'Complete sell intent workspace', completed: false },
        ],
      },
      include: { appointments: true },
    });
  }

  private async ensureDemoContacts() {
    if (await this.prisma.contact.count()) {
      return;
    }

    const agent = await this.prisma.user.findFirst({
      where: { deletedAt: null, OR: [{ role: 'MANAGER' }, { role: 'ADMIN' }, { role: 'SUPER_ADMIN' }] },
      orderBy: { createdAt: 'asc' },
    });

    for (let index = 0; index < demoContacts.length; index += 1) {
      const [slug, firstName, lastName, email, mobile, role, secondaryRoles, address, city, postcode, note, pendingAction, pendingTone] = demoContacts[index];
      const contact = await this.prisma.contact.create({
        data: {
          slug,
          firstName,
          lastName,
          email,
          mobile,
          role: roleLabelToEnum[role],
          secondaryRoles: secondaryRoles.map((item) => roleLabelToEnum[item]),
          address,
          city,
          postcode,
          notes: 'Seeded Contact Intelligence profile.',
          tags: role === 'Vendor' ? ['Sole mandate', 'Chain free'] : [],
          assignedAgentId: agent?.id,
          lastActivityAt: new Date(Date.now() - index * 86400000),
          lastActivityNote: note,
          pendingAction,
          pendingTone,
        },
      });
      if (role === 'Vendor') {
        await this.ensureSellIntent(contact.id, firstName, lastName);
        await this.createMarcusIntel(contact.id);
      }
    }
  }

  private async createMarcusIntel(contactId: string) {
    await this.prisma.contactAiInsight.createMany({
      data: [
        { contactId, title: 'Follow-up risk', body: 'No follow-up in 4 days. Recommend contacting vendor to maintain valuation momentum.', icon: 'alarm' },
        { contactId, title: 'Comparable demand', body: 'Comparable band suggests strongest demand between £3.95M and £4.10M this week.', icon: 'trend' },
        { contactId, title: 'Engagement channel', body: 'Engagement is high. Vendor replies faster to SMS than email for scheduling updates.', icon: 'message' },
      ],
    });
    await this.prisma.contactTimelineEntry.createMany({
      data: [
        { contactId, step: 'Qualified', activity: 'Stage: Qualified', description: 'Vendor motivation and fee expectation recorded; Glass House flagged for sole mandate track.', agentName: 'Alexander Thorne', occurredAt: new Date('2023-10-19T10:05:00.000Z') },
        { contactId, step: 'Property Valuation', activity: 'Valuation booked', description: 'Property valuation visit scheduled. Open Sell intent to capture details.', agentName: 'Julian Vane', occurredAt: new Date('2026-01-14T14:30:00.000Z') },
        { contactId, step: 'Property Valuation', activity: 'Note logged', description: 'Vendor confirmed sole mandate. Discussed expected price range £3.8M-£4.2M.', agentName: 'Julian Vane', occurredAt: new Date('2026-01-22T09:15:00.000Z') },
        { contactId, step: 'Property Valuation', activity: 'Outbound call - 18 mins', description: 'Discussed timing of valuation visit. Fee agreed in principle at 1.25%.', agentName: 'Alexander Thorne', occurredAt: new Date('2026-02-03T11:40:00.000Z') },
        { contactId, step: 'Instruction Document', activity: 'Document uploaded - Agency agreement (draft)', description: 'Draft agency agreement added to vendor vault. Sent to Marcus for review prior to instruction sign-off.', agentName: 'Alexander Thorne', occurredAt: new Date('2026-02-14T15:05:00.000Z') },
      ],
    });
    await this.prisma.contactDocument.createMany({
      data: [
        { contactId, name: 'Agency agreement (draft)', url: '/uploads/documents/agency-agreement-draft.pdf', type: 'document' },
        { contactId, name: 'AML pack (vendor)', url: '/uploads/documents/aml-pack.pdf', type: 'document' },
      ],
    });
  }

  private removeAvatarFile(avatarUrl?: string | null) {
    if (!avatarUrl?.startsWith('/uploads/contact-avatars/')) {
      return;
    }
    const filename = avatarUrl.split('/').at(-1);
    if (!filename) {
      return;
    }
    const avatarPath = join(process.cwd(), 'uploads', 'contact-avatars', filename);
    if (existsSync(avatarPath)) {
      unlinkSync(avatarPath);
    }
  }

  private handlePersistenceError(error: unknown, action: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Failed to ${action}: ${error.code}`, error.stack);

      if (error.code === 'P2002') {
        throw new ConflictException('A contact with this unique value already exists');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('The submitted contact references an invalid related record');
      }
      if (error.code === 'P2022') {
        throw new InternalServerErrorException('Contact database schema is out of sync. Run Prisma migrations and retry.');
      }
    } else {
      this.logger.error(`Failed to ${action}`, error instanceof Error ? error.stack : String(error));
    }

    throw new InternalServerErrorException('Contact request could not be completed. Check the submitted data and retry.');
  }
}
