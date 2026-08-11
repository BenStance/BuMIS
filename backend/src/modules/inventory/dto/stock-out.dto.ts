import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class StockOutDto {
  @IsString()
  @Matches(GUID_PATTERN)
  productId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
