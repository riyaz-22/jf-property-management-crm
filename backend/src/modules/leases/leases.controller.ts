import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateLeaseDto,
  LeaseQueryDto,
  RenewLeaseDto,
  UpdateLeaseDto,
} from './dto/lease.dto';
import { LeasesService } from './leases.service';

@ApiBearerAuth()
@ApiTags('leases')
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  findAll(@Query() query: LeaseQueryDto) {
    return this.leasesService.findAll(query);
  }

  @Get('expiring')
  findExpiring() {
    return this.leasesService.findExpiring();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leasesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeaseDto) {
    return this.leasesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaseDto) {
    return this.leasesService.update(id, dto);
  }

  @Patch(':id/renew')
  renew(@Param('id') id: string, @Body() dto: RenewLeaseDto) {
    return this.leasesService.renew(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leasesService.remove(id);
  }
}
