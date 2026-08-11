import { IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export enum StockAdjustmentDirection {
  INCREASE = 'increase',
  DECREASE = 'decrease',
}

export class StockAdjustmentDto {
  @IsString()
  @Matches(GUID_PATTERN)
  productId!: string;

  @IsEnum(StockAdjustmentDirection)
  adjustmentType!: StockAdjustmentDirection;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  @Matches(GUID_PATTERN)
  approvedByUserId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
