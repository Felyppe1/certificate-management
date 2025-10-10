export interface User {
    id: string
    email: string
    name: string
    passwordHash: string | null
}

export interface IUsersRepository {
    getById(id: string): Promise<User | null>
    getByEmail(email: string): Promise<User | null>
    save(user: User): Promise<void>
}
