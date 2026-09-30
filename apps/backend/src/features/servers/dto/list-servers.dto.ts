import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { ServerStatus } from '../../../generated/prisma/client'

export class ListServersDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string

  @IsOptional()
  @IsUUID()
  providerId?: string

  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus

  @IsOptional()
  @IsString()
  @MaxLength(160)
  projectOrTag?: string
}
