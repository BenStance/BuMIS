import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const SQL_GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreateUserDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @Matches(SQL_GUID_PATTERN, { message: 'businessId must be a valid identifier' })
  businessId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @Matches(SQL_GUID_PATTERN, { message: 'roleId must be a valid identifier' })
  roleId?: string;

  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
