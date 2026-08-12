import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

function normalizeUuidInput(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/^\*+|\*+$/g, '');
}

export class CreatePaymentVoucherAllocationDto {
  @IsString()
  @Transform(({ value }) => normalizeUuidInput(value))
  purchaseInvoiceId!: string;

  @IsNumber()
  @Min(0.01)
  allocatedAmount!: number;
}

export class CreatePaymentVoucherDto {
  @IsString()
  @Transform(({ value }) => normalizeUuidInput(value))
  vendorId!: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  cashOrBankAccountId?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentVoucherAllocationDto)
  allocations!: CreatePaymentVoucherAllocationDto[];
}
