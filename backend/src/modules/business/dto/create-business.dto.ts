import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  businessName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  tin?: string;
}
