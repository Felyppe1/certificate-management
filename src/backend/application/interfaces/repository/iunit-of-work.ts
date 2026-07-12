import { ICertificatesRepository } from './write/icertificates-repository'
import { IEmailsRepository } from './write/iemails-repository'

export interface IUnitOfWork {
    // start(): Promise<void>
    // commit(): Promise<void>
    // rollback(): Promise<void>

    execute<T>(fn: (uow: IUnitOfWork) => Promise<T>): Promise<T>

    // certificateEmissionsRepository: ICertificatesRepository
    // emailsRepository: IEmailsRepository
}
