import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { INotificationGateway } from './interfaces/inotification-gateway'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'

interface Input {
    email: string
}

export class RequestPasswordResetUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByEmail' | 'update'
        >,
        private notificationGateway: Pick<
            INotificationGateway,
            'sendResetPasswordCode'
        >,
    ) {}

    async execute({ email }: Input) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.USER)
        }

        user.generateResetPasswordCode()

        await this.usersRepository.update(user)

        await this.notificationGateway.sendResetPasswordCode(
            email,
            user.getResetPasswordCode()!,
        )
    }
}
