import {
    User,
    IUsersRepository,
} from '@/backend/application/interfaces/iusers-repository'
import { PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'

export class PrismaUsersRepository implements IUsersRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    async getByEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                email,
            },
        })

        if (!user) return null

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash,
        }
    }

    async getById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
        })

        if (!user) return null

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash,
        }
    }

    async save(user: User) {
        await this.prisma.user.create({
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                password_hash: user.passwordHash,
            },
        })
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({
            where: {
                id,
            },
        })
    }
}
