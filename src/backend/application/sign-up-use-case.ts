import { UsersRepository } from "./interfaces/users-repository";
import bcrypt from 'bcrypt'

interface SignUpInput {
    name: string
    email: string
    password: string
}

export class SignUpUseCase {
    constructor(private usersRepository: UsersRepository) {}

    async execute(data: SignUpInput) {
        const userExists = await this.usersRepository.getByEmail(data.email);

        if (userExists) {
            throw new Error('Conflict');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const userId = crypto.randomUUID()

        await this.usersRepository.save({
            id: userId,
            name: data.name,
            email: data.email,
            passwordHash
        });

        return { userId }
    }
}
