import {
    Session,
    ISessionsRepository,
} from '@/backend/application/interfaces/isessions-repository'
import { prisma } from '.'

export class PrismaSessionsRepository implements ISessionsRepository {
    async getById(token: string) {
        const session = await prisma.session.findUnique({
            where: {
                token,
            },
        })

        if (!session) return null

        return {
            userId: session.user_id,
            token: session.token,
        }
    }

    async save(session: Session) {
        await prisma.session.create({
            data: {
                user_id: session.userId,
                token: session.token,
            },
        })
    }

    async deleteById(tokenId: string) {
        await prisma.session.delete({
            where: {
                token: tokenId,
            },
        })
    }
}
