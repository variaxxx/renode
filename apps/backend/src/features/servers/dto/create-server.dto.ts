import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO31661Alpha2,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import { Currency } from '../../../generated/prisma/client'

export class CreateServerDto {
  @IsUUID()
  providerId!: string

  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  name!: string

  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  purpose!: string

  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  tariff!: string

  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  cost!: string

  @IsEnum(Currency)
  currency!: Currency

  @IsInt()
  @Min(1)
  @Max(120)
  billingPeriodMonths!: number

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextPaymentDate!: string

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  rentalEndDate?: string | null

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  cancellationDeadline?: string | null

  @IsBoolean()
  autoRenew!: boolean

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(253)
  domain?: string | null

  @IsOptional()
  @IsISO31661Alpha2()
  country?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(160)
  project?: string | null

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(50, { each: true })
  tags?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string | null
}
