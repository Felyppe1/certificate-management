import { SessionNotFoundError } from '../domain/error/session-not-found-error'
import { ISessionsRepository } from './interfaces/isessions-repository'

export class LogoutUseCase {
    constructor(private readonly sessionsRepository: ISessionsRepository) {}

    async execute(tokenId: string) {
        const session = await this.sessionsRepository.getById(tokenId)

        if (!session) {
            throw new SessionNotFoundError()
        }

        await this.sessionsRepository.deleteById(tokenId)
    }
}
