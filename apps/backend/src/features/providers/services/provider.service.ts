import { Injectable } from '@nestjs/common'
import {
  InvalidProviderError,
  ProviderInUseError,
  ProviderNotFoundError,
} from '../provider.errors'
import type {
  CreateProviderInput,
  Provider,
  UpdateProviderInput,
} from '../provider.types'
import { ProviderRepository } from '../repositories/provider.repository'

@Injectable()
export class ProviderService {
  constructor(private readonly providers: ProviderRepository) {}

  /** Return the provider catalog without exposing persistence details. */
  async list(): Promise<Provider[]> {
    return this.providers.findAll()
  }

  /** Validate and save a new provider. */
  async create(input: CreateProviderInput): Promise<Provider> {
    return this.providers.create({
      name: this.validName(input.name),
      accountUrl: this.validUrl(input.accountUrl),
      note: this.validNote(input.note),
    })
  }

  /** Apply only validated fields to an existing provider. */
  async update(id: string, input: UpdateProviderInput): Promise<Provider> {
    const changes: UpdateProviderInput = {}
    if (input.name !== undefined) changes.name = this.validName(input.name)
    if (input.accountUrl !== undefined)
      changes.accountUrl = this.validUrl(input.accountUrl)
    if (input.note !== undefined) changes.note = this.validNote(input.note)
    if (Object.keys(changes).length === 0)
      throw new InvalidProviderError('At least one field is required')

    try {
      return await this.providers.update(id, changes)
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2025')) throw new ProviderNotFoundError()
      throw error
    }
  }

  /** Delete an empty provider and preserve one stable relation error. */
  async delete(id: string): Promise<void> {
    try {
      await this.providers.delete(id)
    } catch (error) {
      if (this.hasPrismaCode(error, 'P2025')) throw new ProviderNotFoundError()
      if (
        this.hasPrismaCode(error, 'P2003') ||
        this.hasPrismaCode(error, 'P2014')
      )
        throw new ProviderInUseError()
      throw error
    }
  }

  /** Require a nonempty provider name within the database limit. */
  private validName(name: string): string {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 160)
      throw new InvalidProviderError('Name must contain 1 to 160 characters')
    return name.trim()
  }

  /** Require an HTTP(S) account link within the database limit. */
  private validUrl(accountUrl: string): string {
    if (typeof accountUrl !== 'string' || accountUrl.trim().length > 2048)
      throw new InvalidProviderError('Account URL must be an HTTP(S) URL')
    try {
      const url = new URL(accountUrl.trim())
      if (url.protocol === 'http:' || url.protocol === 'https:')
        return accountUrl.trim()
    } catch {
      // Invalid URLs are reported with the same domain error.
    }
    throw new InvalidProviderError('Account URL must be an HTTP(S) URL')
  }

  /** Normalize an optional plain-text note. */
  private validNote(note: string | null | undefined): string | null {
    if (note == null) return null
    if (typeof note !== 'string' || note.length > 4000)
      throw new InvalidProviderError('Note must be at most 4000 characters')
    return note.trim() || null
  }

  /** Recognize an expected Prisma error without hiding unknown failures. */
  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    )
  }
}
