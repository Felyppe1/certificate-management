import {
    CONFLICT_ERROR_TYPE,
    ConflictError,
} from '../domain/error/conflict-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { User } from '../domain/user'
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
            throw new ConflictError(CONFLICT_ERROR_TYPE.USER)
        }

        const passwordHash = await bcrypt.hash(data.password, 10)

        const user = User.create({
            name: data.name,
            email: data.email,
            passwordHash,
        })

        await this.usersRepository.save(user)

        return { userId: user.getId() }
    }
}
