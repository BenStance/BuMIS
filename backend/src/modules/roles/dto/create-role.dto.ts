import { IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
