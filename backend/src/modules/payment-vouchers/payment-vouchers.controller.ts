import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentVouchersService } from './payment-vouchers.service';
import { CreatePaymentVoucherDto } from './dto/create-payment-voucher.dto';
import { VoidPaymentVoucherDto } from './dto/void-payment-voucher.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payment-vouchers')
export class PaymentVouchersController {
  constructor(private readonly paymentVouchersService: PaymentVouchersService) {}

  @Get()
  @Permissions('payment_voucher.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.paymentVouchersService.findAll(user as never, query);
  }

  @Get(':id')
  @Permissions('payment_voucher.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.paymentVouchersService.findOne(id, user as never);
  }

  @Post()
  @Permissions('payment_voucher.create')
  create(@Body() dto: CreatePaymentVoucherDto, @CurrentUser() user: Record<string, unknown>) {
    return this.paymentVouchersService.create(dto, user as never);
  }

  @Post(':id/post')
  @Permissions('payment_voucher.post')
  post(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.paymentVouchersService.post(id, user as never);
  }

  @Post(':id/void')
  @Permissions('payment_voucher.void')
  void(@Param('id') id: string, @Body() dto: VoidPaymentVoucherDto, @CurrentUser() user: Record<string, unknown>) {
    return this.paymentVouchersService.void(id, dto, user as never);
  }
}
