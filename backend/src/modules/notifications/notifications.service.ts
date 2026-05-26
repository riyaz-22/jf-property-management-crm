import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  UpdateNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly elevatedRoles: Role[] = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.MANAGER,
  ];

  async findAll(currentUserId: string, role: Role, query: NotificationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const canViewAll = this.elevatedRoles.includes(role);
    const where: Prisma.NotificationWhereInput = {
      userId: canViewAll && query.userId ? query.userId : currentUserId,
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

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        deletedAt: null,
        readAt: null,
      },
    });

    return { count };
  }

  create(dto: CreateNotificationDto) {
    const { link, actionUrl, ...data } = dto;
    return this.prisma.notification.create({
      data: {
        ...data,
        actionUrl: actionUrl ?? link,
        link: link ?? actionUrl,
      },
    });
  }

  async update(id: string, dto: UpdateNotificationDto) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const { link, actionUrl, ...data } = dto;

    return this.prisma.notification.update({
      where: { id },
      data: {
        ...data,
        ...(actionUrl !== undefined || link !== undefined
          ? {
              actionUrl: actionUrl ?? link,
              link: link ?? actionUrl,
            }
          : {}),
      },
    });
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

  async remove(id: string, userId: string, role: Role) {
    const canRemoveAny = this.elevatedRoles.includes(role);
    const notification = await this.prisma.notification.findFirst({
      where: { id, ...(canRemoveAny ? {} : { userId }), deletedAt: null },
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
