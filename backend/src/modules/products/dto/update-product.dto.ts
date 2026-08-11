import { IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { RecordStatus } from '../../../common/enums/domain.enums';

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class UpdateProductDto {
  @IsOptional()
  @Matches(GUID_PATTERN)
  categoryId?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buyingPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
