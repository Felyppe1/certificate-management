import { UserAlreadyExistsError } from '../domain/error/user-already-exists-error'
import { IUsersRepository } from './interfaces/iusers-repository'
import bcrypt from 'bcrypt'

interface SignUpInput {
    name: string
    email: string
    password: string
}

export class SignUpUseCase {
    constructor(private usersRepository: IUsersRepository) {}

    async execute(data: SignUpInput) {
        const userExists = await this.usersRepository.getByEmail(data.email)

        if (userExists) {
            throw new UserAlreadyExistsError()
        }

        const passwordHash = await bcrypt.hash(data.password, 10)

        const userId = crypto.randomUUID()

        await this.usersRepository.save({
            id: userId,
            name: data.name,
            email: data.email,
            passwordHash,
        })

        return { userId }
    }
}
