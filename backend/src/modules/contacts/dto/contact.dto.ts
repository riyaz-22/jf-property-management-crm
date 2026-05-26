import { PartialType } from '@nestjs/mapped-types';
import { AppointmentStatus, ContactRole, PendingTone } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const toArray = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export class ContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContactRole)
  role?: ContactRole;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  sortBy = 'lastActivityAt';
}

export class CreateContactDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsEnum(ContactRole)
  role!: ContactRole;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(ContactRole, { each: true })
  secondaryRoles?: ContactRole[];

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @IsOptional()
  @IsString()
  lastActivityNote?: string;

  @IsOptional()
  @IsString()
  pendingAction?: string;

  @IsOptional()
  @IsEnum(PendingTone)
  pendingTone?: PendingTone;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}

export class ScheduleValuationDto {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  competingAgents?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes?: number;
}

export class UpdateAppointmentDto extends PartialType(ScheduleValuationDto) {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}

export class UpdateChecklistItemDto {
  @IsString()
  label!: string;

  @IsOptional()
  completed?: boolean;
}
