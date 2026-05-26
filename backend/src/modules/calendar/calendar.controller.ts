import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CalendarService } from './calendar.service';

@ApiBearerAuth()
@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('appointments')
  findAll(@Query() query: Record<string, string>) {
    return this.calendarService.findAll(query);
  }

  @Post('appointments')
  create(@Body() body: Record<string, unknown>, @CurrentUser('id') userId?: string) {
    return this.calendarService.create(body, userId);
  }

  @Patch('appointments/:id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentUser('id') userId?: string) {
    return this.calendarService.update(id, body, userId);
  }

  @Delete('appointments/:id')
  remove(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.calendarService.remove(id, userId);
  }
}
