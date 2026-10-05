import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator'
import { Currency } from '../../../generated/prisma/client'

export class ListPaymentsDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string
  @IsOptional() @IsUUID() providerId?: string
  @IsOptional() @IsString() @MaxLength(160) project?: string
  @IsOptional() @IsEnum(Currency) currency?: Currency
}
export class CancelPaymentDto {
  @IsString() @Matches(/\S/) @MaxLength(500) reason!: string
}
