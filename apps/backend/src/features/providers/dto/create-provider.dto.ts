import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator'

export class CreateProviderDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  name!: string

  @IsString()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  accountUrl!: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string | null
}
