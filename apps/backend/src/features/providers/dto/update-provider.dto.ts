import {
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator'

export class UpdateProviderDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  name?: string

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  accountUrl?: string

  @ValidateIf((_object, value) => value != null)
  @IsString()
  @MaxLength(4000)
  note?: string | null
}
