import { PartialType } from '@nestjs/mapped-types';
import { LeaseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class LeaseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class CreateLeaseDto {
  @IsString()
  propertyId!: string;

  @IsString()
  tenantId!: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeaseDto extends PartialType(CreateLeaseDto) {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  signedAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  terminatedAt?: Date;
}

export class RenewLeaseDto {
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAmount!: number;
}
