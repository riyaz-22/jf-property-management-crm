import { PartialType } from '@nestjs/mapped-types';
import { PropertyStatus, PropertyType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PropertyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @IsOptional()
  @IsString()
  city?: string;
}

export class CreatePropertyDto {
  @IsString()
  reference!: string;

  @IsString()
  title!: string;

  @IsEnum(PropertyType)
  type!: PropertyType;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsString()
  addressLine1!: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsString()
  city!: string;

  @IsString()
  postcode!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  askingPrice?: number;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
