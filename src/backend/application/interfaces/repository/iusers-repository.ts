export interface User {
    id: string
    email: string
    name: string
    passwordHash: string | null
    credits: number
}

export interface IUsersRepository {
    getById(id: string): Promise<User | null>
    getByEmail(email: string): Promise<User | null>
    save(user: User): Promise<void>
    delete(id: string): Promise<void>
    deductCredits(userId: string, amount: number): Promise<boolean>
    resetAllDailyCredits(): Promise<void>
}
