import { UsersRepository } from "./interfaces/users-repository";
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { SessionsRepository } from "./interfaces/sessions-repository";

export class LoginUseCase {
    constructor(private usersRepository: UsersRepository, private sessionsRepository: SessionsRepository) {}
    
    async execute(email: string, password: string) {
        const user = await this.usersRepository.getByEmail(email);

        if (!user) {
            throw new Error('Unauthorized');
        }

        // TODO: check if ''compared to '' passes
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash ?? '')

        if (!isPasswordValid) {
            throw new Error('Unauthorized')
        }

        const sessionToken = crypto.randomBytes(32).toString("hex")

        await this.sessionsRepository.save({
            userId: user.id,
            token: sessionToken
        })

        return {
            token: sessionToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        }
    
    }
}