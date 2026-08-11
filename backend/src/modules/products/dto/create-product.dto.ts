import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreateProductDto {
  @IsOptional()
  @Matches(GUID_PATTERN)
  categoryId?: string;

  @IsString()
  productName!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  buyingPrice!: number;

  @IsNumber()
  @Min(0.01)
  sellingPrice!: number;

  @IsNumber()
  @Min(0)
  initialStockQuantity!: number;

  @IsNumber()
  @Min(0)
  minimumStock!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
