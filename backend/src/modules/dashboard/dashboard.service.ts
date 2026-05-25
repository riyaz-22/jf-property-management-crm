import { Injectable } from '@nestjs/common';
import {
  LeaseStatus,
  MaintenanceStatus,
  PaymentStatus,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const today = new Date();
    const leaseCutoff = new Date();
    leaseCutoff.setDate(today.getDate() + 60);

    const [
      properties,
      occupiedProperties,
      activeLeases,
      expiringLeases,
      overduePayments,
      monthlyRevenue,
      openTickets,
      revenuePayments,
      maintenanceByStatus,
      recentActivity,
    ] = await this.prisma.$transaction([
      this.prisma.property.count({ where: { deletedAt: null } }),
      this.prisma.property.count({
        where: { deletedAt: null, status: PropertyStatus.OCCUPIED },
      }),
      this.prisma.lease.count({
        where: { deletedAt: null, status: LeaseStatus.ACTIVE },
      }),
      this.prisma.lease.count({
        where: {
          deletedAt: null,
          status: LeaseStatus.ACTIVE,
          endDate: { lte: leaseCutoff },
        },
      }),
      this.prisma.payment.count({
        where: {
          deletedAt: null,
          OR: [
            { status: PaymentStatus.OVERDUE },
            { status: PaymentStatus.PENDING, dueDate: { lt: today } },
          ],
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          status: PaymentStatus.PAID,
          paidAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.maintenanceTicket.count({
        where: {
          deletedAt: null,
          status: {
            in: [
              MaintenanceStatus.OPEN,
              MaintenanceStatus.ASSIGNED,
              MaintenanceStatus.IN_PROGRESS,
              MaintenanceStatus.WAITING_TENANT,
            ],
          },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          deletedAt: null,
          status: PaymentStatus.PAID,
          paidAt: {
            gte: new Date(today.getFullYear(), today.getMonth() - 4, 1),
          },
        },
        select: {
          amount: true,
          paidAt: true,
        },
      }),
      this.prisma.maintenanceTicket.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        orderBy: { status: 'asc' },
        _count: true,
      }),
      this.prisma.activity.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          property: {
            select: {
              title: true,
            },
          },
        },
      }),
    ]);

    const revenueTrend = Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 4 + index, 1);
      const label = date.toLocaleString('en-GB', { month: 'short' });
      const value = revenuePayments
        .filter(
          (payment) =>
            payment.paidAt &&
            payment.paidAt.getFullYear() === date.getFullYear() &&
            payment.paidAt.getMonth() === date.getMonth(),
        )
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      return { label, value };
    });

    return {
      kpis: {
        properties,
        occupiedProperties,
        occupancyRate: properties ? Math.round((occupiedProperties / properties) * 100) : 0,
        activeLeases,
        expiringLeases,
        overduePayments,
        monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
        openTickets,
      },
      analytics: {
        revenueTrend,
        maintenanceByStatus: maintenanceByStatus.map((item) => ({
          label: item.status,
          value: Number(item._count),
        })),
      },
      recentActivity,
    };
  }
}
