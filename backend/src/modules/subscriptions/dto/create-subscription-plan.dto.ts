import { IsBoolean, IsNumber, IsOptional, IsString, IsInt, Length, Min } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsString()
  billingCycle!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPrice?: number;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  features?: string;
}
