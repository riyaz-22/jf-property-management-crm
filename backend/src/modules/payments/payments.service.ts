import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePaymentDto,
  MarkPaidDto,
  PaymentQueryDto,
  UpdatePaymentDto,
} from './dto/payment.dto';

const paymentInclude = {
  property: true,
  tenant: true,
  lease: true,
};

const paymentSortFields = new Set([
  'createdAt',
  'updatedAt',
  'reference',
  'amount',
  'dueDate',
  'paidAt',
  'status',
]);

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaymentQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: 'insensitive' } },
              { tenant: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { tenant: { lastName: { contains: query.search, mode: 'insensitive' } } },
              { property: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: paymentInclude,
        skip,
        take,
        orderBy: { [paymentSortFields.has(query.sortBy) ? query.sortBy : 'dueDate']: query.sortOrder },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async dueReminders() {
    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);

    return this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE] },
        dueDate: { lte: inSevenDays },
      },
      include: paymentInclude,
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  create(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        reference: dto.reference,
        amount: dto.amount,
        dueDate: dto.dueDate,
        status: dto.status,
        method: dto.method,
        notes: dto.notes,
        property: { connect: { id: dto.propertyId } },
        tenant: { connect: { id: dto.tenantId } },
        ...(dto.leaseId ? { lease: { connect: { id: dto.leaseId } } } : {}),
      },
      include: paymentInclude,
    });
  }

  async update(id: string, dto: UpdatePaymentDto) {
    await this.findOne(id);
    const { propertyId, tenantId, leaseId, ...data } = dto;

    return this.prisma.payment.update({
      where: { id },
      data: {
        ...data,
        ...(propertyId ? { property: { connect: { id: propertyId } } } : {}),
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
        ...(leaseId ? { lease: { connect: { id: leaseId } } } : {}),
      },
      include: paymentInclude,
    });
  }

  async markPaid(id: string, dto: MarkPaidDto) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: {
        paidAt: dto.paidAt ?? new Date(),
        method: dto.method,
        status: PaymentStatus.PAID,
      },
      include: paymentInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: paymentInclude,
    });
  }
}
