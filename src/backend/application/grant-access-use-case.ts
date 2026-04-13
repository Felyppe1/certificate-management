import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { INotificationEmailGateway } from './interfaces/inotification-email-gateway'
import { IUsersRepository } from './interfaces/repository/iusers-repository'

interface GrantAccessInput {
    email: string
    userId: string
}

export class GrantAccessUseCase {
    constructor(
        private notificationEmailGateway: INotificationEmailGateway,
        private usersRepository: IUsersRepository,
    ) {}

    async execute(data: GrantAccessInput) {
        const user = await this.usersRepository.getById(data.userId)

        if (!user) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.USER)
        }

        if (
            user.getEmail() !== 'felyppe.nunes1@gmail.com' &&
            user.getEmail() !== 'luiz.felyppe@id.uff.br'
        ) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_ADMIN)
        }

        await this.notificationEmailGateway.sendAccessGranted(data.email)
    }
}
