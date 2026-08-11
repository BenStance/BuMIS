import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { RecordStatus } from '../../../common/enums/domain.enums';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
