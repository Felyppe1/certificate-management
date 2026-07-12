import { ISessionsRepository } from '@/backend/application/interfaces/repository/write/isessions-repository'
import { Session } from '@/backend/domain/session'
import { PrismaRepository } from '../prisma-repository'

export class PrismaSessionsRepository
    extends PrismaRepository
    implements ISessionsRepository
{
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
