import { ISessionsRepository } from '@/backend/application/interfaces/repository/isessions-repository'
import { redisClient } from '.'
import { Session } from '@/backend/domain/session'

export class RedisSessionsRepository implements ISessionsRepository {
    async save(session: Session) {
        const ttlSeconds = Math.floor(
            (session.getExpiresAt().getTime() - Date.now()) / 1000,
        )
        await redisClient.set(
            session.getToken(),
            JSON.stringify({
                userId: session.getUserId(),
                expiresAt: session.getExpiresAt().toISOString(),
            }),
            { EX: ttlSeconds },
        )
    }

    async getById(token: string): Promise<Session | null> {
        const raw = await redisClient.get(token)
        if (!raw) return null
        const { userId, expiresAt } = JSON.parse(raw)
        return new Session({ token, userId, expiresAt: new Date(expiresAt) })
    }

    async deleteById(token: string): Promise<void> {
        await redisClient.del(token)
    }
}
