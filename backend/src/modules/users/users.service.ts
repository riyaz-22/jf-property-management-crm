import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  getPaginatedResponse,
  getPagination,
} from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

const userSortFields = new Set([
  'email',
  'firstName',
  'lastName',
  'role',
  'isActive',
  'createdAt',
  'updatedAt',
]);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        skip,
        take,
        orderBy: { [userSortFields.has(query.sortBy) ? query.sortBy : 'createdAt']: query.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return getPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
      },
      select: userSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const { password, email, ...data } = dto;

    if (email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(email ? { email: email.toLowerCase() } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
      select: userSelect,
    });
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const user = await this.findOne(id);
    this.removeAvatarFile(user.avatarUrl);

    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: userSelect,
    });
  }

  async removeAvatar(id: string) {
    const user = await this.findOne(id);
    this.removeAvatarFile(user.avatarUrl);

    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: userSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: userSelect,
    });
  }

  private removeAvatarFile(avatarUrl?: string | null) {
    if (!avatarUrl?.startsWith('/uploads/avatars/')) {
      return;
    }

    const filename = avatarUrl.split('/').at(-1);
    if (!filename) {
      return;
    }

    const avatarPath = join(process.cwd(), 'uploads', 'avatars', filename);
    if (existsSync(avatarPath)) {
      unlinkSync(avatarPath);
    }
  }
}
