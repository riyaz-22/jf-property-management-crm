import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePropertyDto,
  PropertyQueryDto,
  UpdatePropertyDto,
} from './dto/property.dto';
import { PropertiesService } from './properties.service';

@ApiBearerAuth()
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll(@Query() query: PropertyQueryDto) {
    return this.propertiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }
}
