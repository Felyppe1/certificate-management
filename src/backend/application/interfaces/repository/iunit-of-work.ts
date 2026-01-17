import { ICertificatesRepository } from './icertificates-repository'
import { IEmailsRepository } from './iemails-repository'

export interface IUnitOfWork {
    // start(): Promise<void>
    // commit(): Promise<void>
    // rollback(): Promise<void>

    execute<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T>

    // certificateEmissionsRepository: ICertificatesRepository
    // emailsRepository: IEmailsRepository
}
