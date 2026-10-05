import { Injectable } from '@nestjs/common'
import {
  InvalidServerError,
  ServerHasPaymentsError,
  ServerNotFoundError,
} from '../server.errors'
import type {
  Server,
  ServerFilters,
  ServerInput,
  UpdateServerInput,
} from '../server.types'
import { ServerRepository } from '../repositories/server.repository'

@Injectable()
export class ServerService {
  constructor(private readonly servers: ServerRepository) {}

  /** Return servers matching the requested catalog filters. */
  async list(filters: ServerFilters): Promise<Server[]> {
    return this.servers.findAll(filters)
  }

  /** Return a single server or a stable missing-record error. */
  async get(id: string): Promise<Server> {
    const server = await this.servers.findById(id)
    if (!server) throw new ServerNotFoundError()
    return server
  }

  /** Require an existing provider before creating a server. */
  async create(input: ServerInput): Promise<Server> {
    await this.requireProvider(input.providerId)
    try {
      return await this.servers.create(input)
    } catch (error) {
      this.mapWriteError(error)
    }
  }

  /** Reject missing providers before importing the entire batch. */
  async import(inputs: ServerInput[]) {
    for (const id of new Set(inputs.map((s) => s.providerId)))
      await this.requireProvider(id)
    try {
      return await this.servers.import(inputs)
    } catch (error) {
      this.mapWriteError(error)
    }
  }

  /** Enforce catalog invariants while changing a server. */
  async update(id: string, input: UpdateServerInput): Promise<Server> {
    if (input.providerId !== undefined)
      await this.requireProvider(input.providerId)
    try {
      return await this.servers.update(id, input)
    } catch (error) {
      this.mapWriteError(error)
    }
  }

  /** Archive a server without deleting its history. */
  async archive(id: string): Promise<Server> {
    try {
      return await this.servers.archive(id)
    } catch (error) {
      this.mapWriteError(error)
    }
  }

  /** Delete a server only when no payments have been recorded. */
  async delete(id: string): Promise<void> {
    try {
      if (!(await this.servers.delete(id))) throw new ServerHasPaymentsError()
    } catch (error) {
      if (this.hasCode(error, 'P2003')) throw new ServerHasPaymentsError()
      this.mapWriteError(error)
    }
  }

  /** Require an existing provider for server ownership. */
  private async requireProvider(id: string): Promise<void> {
    if (!(await this.servers.providerExists(id)))
      throw new InvalidServerError(
        'providerId must reference an existing provider',
      )
  }

  /** Translate known database failures to stable domain errors. */
  private mapWriteError(error: unknown): never {
    if (this.hasCode(error, 'P2025')) throw new ServerNotFoundError()
    if (this.hasCode(error, 'P2003'))
      throw new InvalidServerError(
        'providerId must reference an existing provider',
      )
    throw error
  }

  /** Identify Prisma failures without hiding unexpected errors. */
  private hasCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    )
  }
}
