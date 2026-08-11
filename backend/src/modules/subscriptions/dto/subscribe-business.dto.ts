import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class SubscribeBusinessDto {
  @IsUUID()
  businessId!: string;

  @IsUUID()
  planId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}
