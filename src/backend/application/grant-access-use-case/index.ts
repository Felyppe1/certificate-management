import { NotAdminError } from '../../domain/error/forbidden-error/not-admin-error'
import { UserNotFoundError } from '../../domain/error/not-found-error/user-not-found-error'
import { INotificationGateway } from '../interfaces/inotification-gateway'
import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { from, subject, buildHtml } from './email-template'

interface GrantAccessInput {
    email: string
    userId: string
}

export class GrantAccessUseCase {
    constructor(
        private notificationEmailGateway: Pick<
            INotificationGateway,
            'sendEmail'
        >,
        private usersRepository: Pick<IUsersRepository, 'getById'>,
    ) {}

    async execute(data: GrantAccessInput) {
        const user = await this.usersRepository.getById(data.userId)

        if (!user) {
            throw new UserNotFoundError()
        }

        if (
            user.getEmail() !== 'felyppe.nunes1@gmail.com' &&
            user.getEmail() !== 'luizfelyppe@id.uff.br'
        ) {
            throw new NotAdminError()
        }

        await this.notificationEmailGateway.sendEmail(
            data.email,
            from,
            subject,
            buildHtml(),
        )
    }
}
