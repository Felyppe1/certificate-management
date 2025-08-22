interface User {
    id: string
    email: string
    name: string
    passwordHash: string
}

export interface UsersRepository {
    getById(id: string): Promise<User | null>;
    getByEmail(email: string): Promise<User | null>;
}