import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationQueryDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: NotificationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
      ...(query.unread === 'true' ? { readAt: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        deletedAt: null,
        readAt: null,
      },
    });
  }

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({ data: dto });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
