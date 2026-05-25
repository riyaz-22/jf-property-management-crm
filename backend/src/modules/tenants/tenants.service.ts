import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignTenantDto,
  CreateTenantDto,
  TenantQueryDto,
  UpdateTenantDto,
} from './dto/tenant.dto';

const tenantInclude = {
  currentProperty: true,
  leases: {
    orderBy: { createdAt: 'desc' as const },
    take: 3,
  },
};

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TenantQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.TenantWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.propertyId ? { currentPropertyId: query.propertyId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        include: tenantInclude,
        skip,
        take,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        currentProperty: true,
        leases: true,
        payments: true,
        maintenanceTickets: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  create(dto: CreateTenantDto) {
    const { currentPropertyId, ...data } = dto;
    return this.prisma.tenant.create({
      data: {
        ...data,
        email: dto.email.toLowerCase(),
        ...(currentPropertyId
          ? { currentProperty: { connect: { id: currentPropertyId } } }
          : {}),
      },
      include: tenantInclude,
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    const { currentPropertyId, email, ...data } = dto;

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...data,
        ...(email ? { email: email.toLowerCase() } : {}),
        ...(currentPropertyId
          ? { currentProperty: { connect: { id: currentPropertyId } } }
          : {}),
      },
      include: tenantInclude,
    });
  }

  async assign(id: string, dto: AssignTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        currentProperty: { connect: { id: dto.propertyId } },
      },
      include: tenantInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: tenantInclude,
    });
  }
}
