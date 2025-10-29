import {
    User,
    IUsersRepository,
} from '@/backend/application/interfaces/iusers-repository'
import { PrismaClient } from './client/client'

export class PrismaUsersRepository implements IUsersRepository {
    constructor(private readonly prisma: PrismaClient) {}

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
}
