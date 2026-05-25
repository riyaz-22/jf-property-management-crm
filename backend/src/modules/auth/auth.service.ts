import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequiredEnv } from '../../config/env.validation';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './dto/auth.dto';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt || !user.isActive) {
      throw new ForbiddenException('Account is inactive. Contact an administrator.');
    }

    if (!user.role) {
      throw new ForbiddenException('Account role is missing. Contact an administrator.');
    }

    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createSession(user, ip);
  }

  async refresh(dto: RefreshTokenDto, ip?: string) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date() ||
      storedToken.user.deletedAt ||
      !storedToken.user.isActive
    ) {
      throw new UnauthorizedException('Refresh token is invalid, expired, or revoked');
    }

    const refreshToken = this.createOpaqueToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    const newToken = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          tokenHash: refreshTokenHash,
          userId: storedToken.userId,
          expiresAt,
          createdByIp: ip,
        },
      });

      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          revokedByIp: ip,
          replacedByTokenId: created.id,
        },
      });

      return created;
    });

    return {
      user: this.sanitizeUser(storedToken.user),
      accessToken: await this.signAccessToken(storedToken.user),
      refreshToken,
      refreshTokenExpiresAt: newToken.expiresAt,
    };
  }

  async logout(refreshToken?: string, ip?: string) {
    if (!refreshToken) {
      return { message: 'Session cleared' };
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedByIp: ip,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
        isActive: true,
      },
    });

    if (!user) {
      return { message: 'If the account exists, a reset email has been sent' };
    }

    const token = this.createOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: this.hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    return {
      message: 'Password reset token created',
      resetToken: token,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(dto.token) },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      resetToken.user.deletedAt
    ) {
      throw new UnauthorizedException('Reset token is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully' };
  }

  private async createSession(user: User, ip?: string) {
    const refreshToken = this.createOpaqueToken();
    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
        createdByIp: ip,
      },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken: await this.signAccessToken(user),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenRecord.expiresAt,
    };
  }

  private signAccessToken(user: User) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.jwtSecret(),
        expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as never,
      },
    );
  }

  private jwtSecret() {
    return (
      this.config.get<string>('JWT_SECRET') ??
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      getRequiredEnv('JWT_SECRET', ['JWT_ACCESS_SECRET'])
    );
  }

  private sanitizeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private createOpaqueToken() {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTtlMs() {
    const value = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const match = value.match(/^(\d+)([dhm])$/);

    if (!match) {
      return 1000 * 60 * 60 * 24 * 7;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers = {
      d: 1000 * 60 * 60 * 24,
      h: 1000 * 60 * 60,
      m: 1000 * 60,
    };

    return amount * multipliers[unit as keyof typeof multipliers];
  }
}
