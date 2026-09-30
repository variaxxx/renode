import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { CreateProviderDto } from '../dto/create-provider.dto'
import { ProviderResponseDto } from '../dto/provider-response.dto'
import { UpdateProviderDto } from '../dto/update-provider.dto'
import { ProviderService } from '../services/provider.service'

@Controller('providers')
export class ProviderController {
  constructor(private readonly providers: ProviderService) {}

  /** List providers for the signed-in owner. */
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(): Promise<ProviderResponseDto[]> {
    return (await this.providers.list()).map(ProviderResponseDto.fromProvider)
  }

  /** Create a provider from validated catalog fields. */
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: CreateProviderDto): Promise<ProviderResponseDto> {
    return ProviderResponseDto.fromProvider(await this.providers.create(body))
  }

  /** Change the selected provider's catalog fields. */
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    return ProviderResponseDto.fromProvider(
      await this.providers.update(id, body),
    )
  }

  /** Delete a provider only when it has no linked servers. */
  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.providers.delete(id)
  }
}
