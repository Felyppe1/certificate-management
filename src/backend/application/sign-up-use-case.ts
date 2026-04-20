import {
    CONFLICT_ERROR_TYPE,
    ConflictError,
} from '../domain/error/conflict-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { INotificationGateway } from './interfaces/inotification-gateway'
import { User } from '../domain/user'

interface SignUpInput {
    name: string
    email: string
    password: string
}

export class SignUpUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getByEmail' | 'save'>,
        private notificationGateway: Pick<
            INotificationGateway,
            'sendEmailVerification'
        >,
    ) {}

    async execute(data: SignUpInput) {
        const userExists = await this.usersRepository.getByEmail(data.email)

        if (userExists) {
            throw new ConflictError(CONFLICT_ERROR_TYPE.USER)
        }

        const user = await User.create({
            name: data.name,
            email: data.email,
            passwordHash: data.password,
        })

        await this.usersRepository.save(user)

        await this.notificationGateway.sendEmailVerification(
            data.email,
            user.getVerificationToken()!,
        )

        return { userId: user.getId() }
    }
}
