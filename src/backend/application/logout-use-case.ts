import { SessionNotFoundError } from '../domain/error/session-not-found-error'
import { SessionsRepository } from './interfaces/sessions-repository'

export class LogoutUseCase {
    constructor(private readonly sessionsRepository: SessionsRepository) {}

    async execute(tokenId: string) {
        const session = await this.sessionsRepository.getById(tokenId)

        if (!session) {
            throw new SessionNotFoundError()
        }

        await this.sessionsRepository.deleteById(tokenId)
    }
}
