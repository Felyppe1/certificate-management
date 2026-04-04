import { ISessionsRepository } from '@/backend/application/interfaces/repository/isessions-repository'
import { PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'
import { Session } from '@/backend/domain/session'

export class PrismaSessionsRepository implements ISessionsRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    async getById(token: string) {
        const session = await this.prisma.session.findUnique({
            where: {
                token,
            },
        })

        if (!session) return null

        return new Session({
            token: session.token,
            userId: session.user_id,
            expiresAt: session.expires_at,
        })
    }

    async save(session: Session) {
        await this.prisma.session.create({
            data: {
                user_id: session.getUserId(),
                token: session.getToken(),
                expires_at: session.getExpiresAt(),
            },
        })
    }

    async deleteById(tokenId: string) {
        await this.prisma.session.delete({
            where: {
                token: tokenId,
            },
        })
    }
}
