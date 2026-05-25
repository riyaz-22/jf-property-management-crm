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
        revenueTrend: [
          { label: 'Jan', value: 68000 },
          { label: 'Feb', value: 72000 },
          { label: 'Mar', value: 76000 },
          { label: 'Apr', value: 73500 },
          { label: 'May', value: Number(monthlyRevenue._sum.amount ?? 81200) },
        ],
        maintenanceByStatus: [
          { label: 'Open', value: openTickets },
          { label: 'Resolved', value: 19 },
          { label: 'Waiting', value: 6 },
        ],
      },
      recentActivity,
    };
  }
}
