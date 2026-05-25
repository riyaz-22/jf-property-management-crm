import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePropertyDto,
  PropertyQueryDto,
  UpdatePropertyDto,
} from './dto/property.dto';

const propertyInclude = {
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  _count: {
    select: {
      tenants: true,
      leases: true,
      maintenanceTickets: true,
    },
  },
};

const propertySortFields = new Set([
  'createdAt',
  'updatedAt',
  'reference',
  'title',
  'city',
  'postcode',
  'status',
  'type',
  'rentAmount',
  'askingPrice',
]);

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PropertyQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { addressLine1: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { postcode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        include: propertyInclude,
        skip,
        take,
        orderBy: { [propertySortFields.has(query.sortBy) ? query.sortBy : 'createdAt']: query.sortOrder },
      }),
      this.prisma.property.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...propertyInclude,
        tenants: true,
        leases: true,
        payments: true,
        maintenanceTickets: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  create(dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: dto,
      include: propertyInclude,
    });
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.findOne(id);
    return this.prisma.property.update({
      where: { id },
      data: dto,
      include: propertyInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: propertyInclude,
    });
  }
}
