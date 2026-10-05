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
  Query,
} from '@nestjs/common'
import { ImportServersDto } from '../dto/import-servers.dto'
import { CreateServerDto } from '../dto/create-server.dto'
import { ListServersDto } from '../dto/list-servers.dto'
import { ServerResponseDto } from '../dto/server-response.dto'
import { UpdateServerDto } from '../dto/update-server.dto'
import { ServerService } from '../services/server.service'

@Controller('servers')
export class ServerController {
  constructor(private readonly servers: ServerService) {}

  /** List servers for the signed-in owner. */
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Query() filters: ListServersDto) {
    return (await this.servers.list(filters)).map(ServerResponseDto.fromServer)
  }

  /** Return one server card. */
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return ServerResponseDto.fromServer(await this.servers.get(id))
  }

  /** Create a server from validated fields. */
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: CreateServerDto) {
    return ServerResponseDto.fromServer(await this.servers.create(body))
  }

  /** Import a validated catalog batch atomically. */
  @Post('import')
  @Header('Cache-Control', 'no-store')
  async import(@Body() body: ImportServersDto) {
    return (await this.servers.import(body.servers)).map(
      ServerResponseDto.fromServer,
    )
  }

  /** Change an existing server. */
  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateServerDto,
  ) {
    return ServerResponseDto.fromServer(await this.servers.update(id, body))
  }

  /** Archive a server and preserve its history. */
  @Post(':id/archive')
  @Header('Cache-Control', 'no-store')
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    return ServerResponseDto.fromServer(await this.servers.archive(id))
  }

  /** Delete a server without payment history. */
  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.servers.delete(id)
  }
}
