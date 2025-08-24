export interface Session {
    userId: string
    token: string
}

export interface SessionsRepository {
    save(session: Session): Promise<void>
    getById(token: string): Promise<Session | null>
    deleteById(token: string): Promise<void>
}