import { IsString, MinLength } from 'class-validator';

export class ReversePurchaseInvoiceDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
