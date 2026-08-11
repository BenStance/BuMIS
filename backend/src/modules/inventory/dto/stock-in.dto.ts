import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class StockInDto {
  @IsString()
  @Matches(GUID_PATTERN)
  productId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @Matches(GUID_PATTERN)
  vendorId?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  stockInDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
