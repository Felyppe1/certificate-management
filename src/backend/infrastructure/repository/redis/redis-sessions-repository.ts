import {
    Session,
    ISessionsRepository,
} from '@/backend/application/interfaces/isessions-repository'
import { redisClient } from '.'

export class PrismaSessionsRepository implements ISessionsRepository {
    async save(session: Session) {
        await redisClient.set(session.token, session.userId)
    }

    async getById(token: string): Promise<Session | null> {
        const userId = await redisClient.get(token)
        if (!userId) return null
        return { token, userId }
    }

    async deleteById(token: string): Promise<void> {
        await redisClient.del(token)
    }
}
