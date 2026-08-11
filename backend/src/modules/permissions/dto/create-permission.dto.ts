import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @Length(3, 100)
  code!: string;

  @IsString()
  @Length(3, 150)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  module?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
