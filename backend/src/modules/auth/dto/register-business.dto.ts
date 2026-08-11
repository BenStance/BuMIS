import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  businessName!: string;

  @IsEmail()
  businessEmail!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  tin?: string;

  @IsString()
  ownerFullName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(6)
  ownerPassword!: string;
}
