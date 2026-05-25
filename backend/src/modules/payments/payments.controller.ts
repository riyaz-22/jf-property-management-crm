import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreatePaymentDto,
  MarkPaidDto,
  PaymentQueryDto,
  UpdatePaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiBearerAuth()
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Get('due-reminders')
  dueReminders() {
    return this.paymentsService.dueReminders();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @Patch(':id/mark-paid')
  markPaid(@Param('id') id: string, @Body() dto: MarkPaidDto) {
    return this.paymentsService.markPaid(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
