import { PartialType } from '@nestjs/mapped-types';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  unread?: string;
}

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  link?: string;
}

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
