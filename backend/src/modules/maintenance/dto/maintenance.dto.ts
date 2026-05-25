import { PartialType } from '@nestjs/mapped-types';
import { MaintenancePriority, MaintenanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MaintenanceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class CreateMaintenanceDto {
  @IsString()
  propertyId!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}

export class AssignTicketDto {
  @IsString()
  assigneeId!: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;
}
