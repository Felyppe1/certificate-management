import { AuthenticationError } from '../domain/error/authentication-error'
import { ISessionsRepository } from './interfaces/isessions-repository'

export class LogoutUseCase {
    constructor(private readonly sessionsRepository: ISessionsRepository) {}

    async execute(tokenId: string) {
        const session = await this.sessionsRepository.getById(tokenId)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        await this.sessionsRepository.deleteById(tokenId)
    }
}
