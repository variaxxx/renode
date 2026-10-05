import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common'
import { requireAuth, type AuthenticatedRequest } from '../../auth/auth.request'
import {
  CiphertextDto,
  UpdateMasterWrapperDto,
  VaultMetadataDto,
} from '../dto/vault-metadata.dto'
import { VaultService } from '../services/vault.service'
import type { Response } from 'express'
import {
  CiphertextResponseDto,
  VaultResponseDto,
} from '../dto/vault-response.dto'

@Controller('vault')
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  /** Read public vault metadata for the authenticated owner. */
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const metadata = await this.vault.read(requireAuth(request).ownerId)
    response.json(metadata ? VaultResponseDto.fromMetadata(metadata) : null)
  }

  /** Store client-generated wrappers without unlock secrets. */
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: VaultMetadataDto,
  ): Promise<VaultResponseDto> {
    return VaultResponseDto.fromMetadata(
      await this.vault.create(requireAuth(request).ownerId, body),
    )
  }

  /** Accept a new master wrapper after client-side password change or recovery. */
  @Patch('master')
  @Header('Cache-Control', 'no-store')
  async updateMaster(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateMasterWrapperDto,
  ): Promise<VaultResponseDto> {
    return VaultResponseDto.fromMetadata(
      await this.vault.updateMaster(requireAuth(request).ownerId, body.master),
    )
  }

  /** Read the encrypted password bound to this provider. */
  @Get('providers/:providerId/secret')
  @Header('Cache-Control', 'no-store')
  async readSecret(
    @Req() request: AuthenticatedRequest,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Res() response: Response,
  ): Promise<void> {
    const encrypted = await this.vault.readSecret(
      requireAuth(request).ownerId,
      providerId,
    )
    response.json(
      encrypted ? CiphertextResponseDto.fromCiphertext(encrypted) : null,
    )
  }

  /** Persist a client-encrypted provider password. */
  @Put('providers/:providerId/secret')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async writeSecret(
    @Req() request: AuthenticatedRequest,
    @Param('providerId', ParseUUIDPipe) providerId: string,
    @Body() body: CiphertextDto,
  ): Promise<void> {
    await this.vault.writeSecret(requireAuth(request).ownerId, providerId, body)
  }
}
