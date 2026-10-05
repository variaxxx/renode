import { Injectable } from '@nestjs/common'
import { OwnerRepository } from '../repositories/owner.repository'

@Injectable()
export class OwnerSetupService {
  constructor(private readonly owners: OwnerRepository) {}

  /** Create the only owner with an Argon2id password hash. */
  async createOwner(password: string): Promise<void> {
    if (password.length < 12 || password.length > 256) {
      throw new Error('Owner password must contain 12 to 256 characters')
    }
    if (await this.owners.exists()) throw new Error('Owner already exists')

    const passwordHash = await Bun.password.hash(password, 'argon2id')
    try {
      await this.owners.create(passwordHash)
    } catch (error) {
      if (this.isUniqueConstraintError(error))
        throw new Error('Owner already exists', { cause: error })
      throw error
    }
  }

  /** Recognize a concurrent attempt to create the same owner. */
  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    )
  }
}
