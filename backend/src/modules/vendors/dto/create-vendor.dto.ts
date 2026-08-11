import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
