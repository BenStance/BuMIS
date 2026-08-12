import { IsString, MinLength } from 'class-validator';

export class VoidPaymentVoucherDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
