import type { Server as ServerRecord } from '../../generated/prisma/client'
import type { CreateServerDto } from './dto/create-server.dto'
import type { UpdateServerDto } from './dto/update-server.dto'
import type { ListServersDto } from './dto/list-servers.dto'

export type Server = ServerRecord
export type ServerInput = CreateServerDto
export type UpdateServerInput = UpdateServerDto
export type ServerFilters = ListServersDto
