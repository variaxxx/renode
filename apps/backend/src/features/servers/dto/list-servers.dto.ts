import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { ServerStatus } from '../../../generated/prisma/client'

export class ListServersDto {
  @IsOptional()
  @IsIn(['name', 'payment', 'costAsc', 'costDesc'])
  sort?: 'name' | 'payment' | 'costAsc' | 'costDesc'

  @IsOptional()
  @IsString()
  @MaxLength(253)
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
