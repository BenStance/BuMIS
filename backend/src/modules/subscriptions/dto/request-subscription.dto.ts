import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum SubscriptionBillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class RequestSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsEnum(SubscriptionBillingCycle)
  billingCycle?: SubscriptionBillingCycle;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  transactionReference?: string;

}
