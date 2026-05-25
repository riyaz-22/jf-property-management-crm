import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaseStatus, Prisma } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLeaseDto,
  LeaseQueryDto,
  RenewLeaseDto,
  UpdateLeaseDto,
} from './dto/lease.dto';

const leaseInclude = {
  property: true,
  tenant: true,
  payments: {
    orderBy: { dueDate: 'desc' as const },
    take: 6,
  },
};

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: LeaseQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.LeaseWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.search
        ? {
            OR: [
              { property: { title: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { lastName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lease.findMany({
        where,
        include: leaseInclude,
        skip,
        take,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.lease.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async findExpiring(days = 60) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.lease.findMany({
      where: {
        deletedAt: null,
        status: LeaseStatus.ACTIVE,
        endDate: { lte: endDate },
      },
      include: leaseInclude,
      orderBy: { endDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, deletedAt: null },
      include: leaseInclude,
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return lease;
  }

  create(dto: CreateLeaseDto) {
    return this.prisma.lease.create({
      data: {
        startDate: dto.startDate,
        endDate: dto.endDate,
        rentAmount: dto.rentAmount,
        depositAmount: dto.depositAmount,
        status: dto.status,
        notes: dto.notes,
        property: { connect: { id: dto.propertyId } },
        tenant: { connect: { id: dto.tenantId } },
      },
      include: leaseInclude,
    });
  }

  async update(id: string, dto: UpdateLeaseDto) {
    await this.findOne(id);
    const { propertyId, tenantId, ...data } = dto;

    return this.prisma.lease.update({
      where: { id },
      data: {
        ...data,
        ...(propertyId ? { property: { connect: { id: propertyId } } } : {}),
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
      },
      include: leaseInclude,
    });
  }

  async renew(id: string, dto: RenewLeaseDto) {
    await this.findOne(id);
    return this.prisma.lease.update({
      where: { id },
      data: {
        endDate: dto.endDate,
        rentAmount: dto.rentAmount,
        status: LeaseStatus.RENEWED,
        renewalOfferedAt: new Date(),
      },
      include: leaseInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.lease.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: leaseInclude,
    });
  }
}
