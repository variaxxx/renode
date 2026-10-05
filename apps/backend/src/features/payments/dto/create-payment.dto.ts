import { IsEnum, IsISO8601, IsString, IsUUID, Matches } from 'class-validator'
import { Currency } from '../../../generated/prisma/client'

export class CreatePaymentDto {
  @IsUUID()
  requestKey!: string

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paymentDate!: string

  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  amount!: string

  @IsEnum(Currency)
  currency!: Currency

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextPaymentDate!: string
}
