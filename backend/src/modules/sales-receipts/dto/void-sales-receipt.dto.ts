import { IsString, MinLength } from 'class-validator';

export class VoidSalesReceiptDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
