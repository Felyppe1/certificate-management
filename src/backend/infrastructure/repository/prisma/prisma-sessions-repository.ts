import {
    Session,
    ISessionsRepository,
} from '@/backend/application/interfaces/isessions-repository'
import { PrismaExecutor } from '.'

export class PrismaSessionsRepository implements ISessionsRepository {
    constructor(private readonly prisma: PrismaExecutor) {}

    async getById(token: string) {
        const session = await this.prisma.session.findUnique({
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
        await this.prisma.session.create({
            data: {
                user_id: session.userId,
                token: session.token,
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
