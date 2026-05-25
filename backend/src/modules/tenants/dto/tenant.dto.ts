import { PartialType } from '@nestjs/mapped-types';
import { LeaseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TenantQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsEnum(LeaseStatus)
  leaseStatus?: LeaseStatus;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  activeState?: 'active' | 'inactive';

  @IsOptional()
  @IsIn(['createdAt', 'firstName', 'lastName', 'status', 'moveInDate'])
  sortBy = 'createdAt';
}

export class CreateTenantDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  currentPropertyId?: string;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}

export class AssignTenantDto {
  @IsString()
  propertyId!: string;
}
