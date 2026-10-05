import { Type } from 'class-transformer'
import {
  Equals,
  IsDefined,
  IsObject,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
} from 'class-validator'

@ValidatorConstraint({ name: 'vaultEncoding', async: false })
export class VaultEncoding implements ValidatorConstraintInterface {
  /** Check canonical base64url and the expected decoded byte range. */
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value))
      return false
    const bytes = Buffer.from(value, 'base64url')
    const [min, max] = args.constraints as [number, number]
    return (
      bytes.toString('base64url') === value &&
      bytes.length >= min &&
      bytes.length <= max
    )
  }

  /** Return a safe validation message without echoing encrypted input. */
  defaultMessage(): string {
    return 'Invalid encoded vault field'
  }
}

export class CiphertextDto {
  @Equals(1)
  version!: 1

  @Equals('AES-256-GCM')
  algorithm!: 'AES-256-GCM'

  @IsString()
  @MaxLength(16)
  @Validate(VaultEncoding, [12, 12])
  nonce!: string

  @IsString()
  @MaxLength(22000)
  @Validate(VaultEncoding, [16, 16400])
  ciphertext!: string
}

export class WrappedDekDto extends CiphertextDto {
  @IsString()
  @MaxLength(64)
  @Validate(VaultEncoding, [48, 48])
  declare ciphertext: string
}

export class MasterWrapperDto {
  @Equals('Argon2id')
  kdf!: 'Argon2id'

  @IsString()
  @MaxLength(22)
  @Validate(VaultEncoding, [16, 16])
  salt!: string

  @Equals(65536)
  memoryKiB!: number

  @Equals(3)
  iterations!: number

  @Equals(1)
  parallelism!: number

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => WrappedDekDto)
  wrappedDek!: WrappedDekDto
}

export class RecoveryWrapperDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => WrappedDekDto)
  wrappedDek!: WrappedDekDto
}

export class VaultMetadataDto {
  @Equals(1)
  version!: 1

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MasterWrapperDto)
  master!: MasterWrapperDto

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RecoveryWrapperDto)
  recovery!: RecoveryWrapperDto
}

export class UpdateMasterWrapperDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MasterWrapperDto)
  master!: MasterWrapperDto
}
