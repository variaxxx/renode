import { PartialType } from '@nestjs/mapped-types'
import { IsISO8601, IsString } from 'class-validator'
import { CreateServerDto } from './create-server.dto'

export class UpdateServerDto extends PartialType(CreateServerDto, {
  skipNullProperties: false,
}) {
  @IsString()
  @IsISO8601({ strict: true })
  expectedUpdatedAt!: string
}
