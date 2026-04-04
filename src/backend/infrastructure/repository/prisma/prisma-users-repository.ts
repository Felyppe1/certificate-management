import {
    IUsersRepository,
    USER_CREDITS,
} from '@/backend/application/interfaces/repository/iusers-repository'
import { User } from '@/backend/domain/user'
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

        return new User({
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash,
            credits: user.credits,
        })
    }

    async getById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
        })

        if (!user) return null

        return new User({
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash,
            credits: user.credits,
        })
    }

    async save(user: User) {
        await this.prisma.user.create({
            data: {
                id: user.getId(),
                email: user.getEmail(),
                name: user.getName(),
                password_hash: user.getPasswordHash(),
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

    async deductCredits(userId: string, amount: number): Promise<boolean> {
        const result = await this.prisma.user.updateMany({
            where: { id: userId, credits: { gte: amount } },
            data: { credits: { decrement: amount } },
        })
        return result.count > 0
    }

    async resetAllDailyCredits(): Promise<void> {
        await this.prisma.user.updateMany({
            data: { credits: USER_CREDITS },
        })
    }

    async upsertDailyUsage(
        userId: string,
        increment: {
            certificatesGeneratedCount?: number
            emailsSentCount?: number
        },
    ): Promise<void> {
        const date = new Date()
        await this.prisma.dailyUsage.upsert({
            where: {
                user_id_date: { user_id: userId, date },
            },
            create: {
                user_id: userId,
                date,
                certificates_generated_count:
                    increment.certificatesGeneratedCount ?? 0,
                emails_sent_count: increment.emailsSentCount ?? 0,
            },
            update: {
                certificates_generated_count: {
                    increment: increment.certificatesGeneratedCount ?? 0,
                },
                emails_sent_count: {
                    increment: increment.emailsSentCount ?? 0,
                },
            },
        })
    }
}
