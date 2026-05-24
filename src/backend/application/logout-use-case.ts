import { SessionNotFoundError } from '../domain/error/authentication-error/session-not-found-error'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'

export class LogoutUseCase {
    constructor(
        private readonly sessionsRepository: Pick<
            ISessionsRepository,
            'getById' | 'deleteById'
        >,
    ) {}

    async execute(tokenId: string) {
        const session = await this.sessionsRepository.getById(tokenId)

        if (!session) {
            throw new SessionNotFoundError()
        }

        await this.sessionsRepository.deleteById(tokenId)
    }
}
