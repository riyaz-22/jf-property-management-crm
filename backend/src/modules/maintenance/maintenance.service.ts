import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, Prisma } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignTicketDto,
  CreateMaintenanceDto,
  MaintenanceQueryDto,
  UpdateMaintenanceDto,
  UpdateTicketStatusDto,
} from './dto/maintenance.dto';

const ticketInclude = {
  property: true,
  tenant: true,
  assignee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
};

const maintenanceSortFields = new Set([
  'createdAt',
  'updatedAt',
  'title',
  'priority',
  'status',
  'dueDate',
  'cost',
]);

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: MaintenanceQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.MaintenanceTicketWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { property: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceTicket.findMany({
        where,
        include: ticketInclude,
        skip,
        take,
        orderBy: { [maintenanceSortFields.has(query.sortBy) ? query.sortBy : 'createdAt']: query.sortOrder },
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const ticket = await this.prisma.maintenanceTicket.findFirst({
      where: { id, deletedAt: null },
      include: ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException('Maintenance ticket not found');
    }

    return ticket;
  }

  create(dto: CreateMaintenanceDto) {
    return this.prisma.maintenanceTicket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        dueDate: dto.dueDate,
        cost: dto.cost,
        property: { connect: { id: dto.propertyId } },
        ...(dto.tenantId ? { tenant: { connect: { id: dto.tenantId } } } : {}),
        ...(dto.assigneeId
          ? { assignee: { connect: { id: dto.assigneeId } } }
          : {}),
      },
      include: ticketInclude,
    });
  }

  async update(id: string, dto: UpdateMaintenanceDto) {
    await this.findOne(id);
    const { propertyId, tenantId, assigneeId, ...data } = dto;

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        ...data,
        ...(propertyId ? { property: { connect: { id: propertyId } } } : {}),
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
        ...(assigneeId ? { assignee: { connect: { id: assigneeId } } } : {}),
      },
      include: ticketInclude,
    });
  }

  async assign(id: string, dto: AssignTicketDto) {
    await this.findOne(id);
    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        assignee: { connect: { id: dto.assigneeId } },
        status: MaintenanceStatus.ASSIGNED,
      },
      include: ticketInclude,
    });
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto) {
    await this.findOne(id);
    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status: dto.status,
        completedAt:
          dto.status === MaintenanceStatus.COMPLETED ? new Date() : undefined,
      },
      include: ticketInclude,
    });
  }

  async attachFile(id: string, file?: Express.Multer.File) {
    await this.findOne(id);
    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        attachmentUrl: file ? `/uploads/${file.originalname}` : undefined,
      },
      include: ticketInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: ticketInclude,
    });
  }
}
