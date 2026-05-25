import { PartialType } from '@nestjs/mapped-types';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PaymentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class CreatePaymentDto {
  @IsString()
  reference!: string;

  @IsString()
  propertyId!: string;

  @IsString()
  tenantId!: string;

  @IsOptional()
  @IsString()
  leaseId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @Type(() => Date)
  @IsDate()
  dueDate!: Date;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;
}

export class MarkPaidDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;
}
