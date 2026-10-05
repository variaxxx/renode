import { Type } from 'class-transformer'
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator'
import { CreateServerDto } from './create-server.dto'
export class ImportServersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateServerDto)
  servers!: CreateServerDto[]
}
