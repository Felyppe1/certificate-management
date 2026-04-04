import { Session } from '../../../domain/session'

export interface ISessionsRepository {
    save(session: Session): Promise<void>
    getById(token: string): Promise<Session | null>
    deleteById(token: string): Promise<void>
}
