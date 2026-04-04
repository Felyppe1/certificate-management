import { User } from '../../../domain/user'
export { USER_CREDITS } from '../../../domain/user'

export interface IUsersRepository {
    getById(id: string): Promise<User | null>
    getByEmail(email: string): Promise<User | null>
    save(user: User): Promise<void>
    delete(id: string): Promise<void>
    deductCredits(userId: string, amount: number): Promise<boolean>
    resetAllDailyCredits(): Promise<void>
    upsertDailyUsage(
        userId: string,
        increment: {
            certificatesGeneratedCount?: number
            emailsSentCount?: number
        },
    ): Promise<void>
}
