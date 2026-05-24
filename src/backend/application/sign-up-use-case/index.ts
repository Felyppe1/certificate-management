import { UserAlreadyExistsError } from '../../domain/error/conflict-error/user-already-exists-error'
import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { INotificationGateway } from '../interfaces/inotification-gateway'
import { User } from '../../domain/user'
import { from, subject, buildHtml } from './email-template'

interface SignUpInput {
    name: string
    email: string
    password: string
}

export class SignUpUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByEmail' | 'getByExternalAccountEmail' | 'save'
        >,
        private notificationGateway: Pick<INotificationGateway, 'sendEmail'>,
    ) {}

    async execute(data: SignUpInput) {
        const userExists = await this.usersRepository.getByEmail(data.email)

        if (userExists) {
            throw new UserAlreadyExistsError()
        }

        const user = await User.create({
            name: data.name,
            email: data.email,
            passwordHash: data.password,
        })

        await this.usersRepository.save(user)

        await this.notificationGateway.sendEmail(
            data.email,
            from,
            subject,
            buildHtml(user.getEmailVerificationCode()!),
        )

        const googleUser = await this.usersRepository.getByExternalAccountEmail(
            'GOOGLE',
            data.email,
        )
        const googleLinkingSuggestion =
            !!googleUser && !googleUser.hasSystemLogin()

        return { userId: user.getId(), googleLinkingSuggestion }
    }
}
