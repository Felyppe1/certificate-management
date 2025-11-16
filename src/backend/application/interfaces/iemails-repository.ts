import { Email } from '@/backend/domain/email'

export interface IEmailsRepository {
    save(email: Email): Promise<void>
    update(email: Email): Promise<void>
    getById(id: string): Promise<Email | null>
}
