import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator'
import type { NotificationSettings } from '../notification.types'

export class NotificationSettingsDto implements NotificationSettings {
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @Matches(/^-?[1-9]\d{0,15}$/)
  chatId!: string | null

  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  threadId!: number | null

  @IsString()
  @MaxLength(100)
  timezone!: string

  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(365, { each: true })
  paymentIntervals!: number[]

  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(365, { each: true })
  rentalEndIntervals!: number[]

  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(365, { each: true })
  cancellationIntervals!: number[]

  /** Expose notification settings without persistence metadata. */
  static fromSettings(settings: NotificationSettings): NotificationSettingsDto {
    return {
      chatId: settings.chatId,
      threadId: settings.threadId,
      timezone: settings.timezone,
      paymentIntervals: settings.paymentIntervals,
      rentalEndIntervals: settings.rentalEndIntervals,
      cancellationIntervals: settings.cancellationIntervals,
    }
  }
}
