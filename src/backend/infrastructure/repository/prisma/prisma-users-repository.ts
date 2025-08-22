import { UsersRepository } from "@/backend/application/interfaces/users-repository";
import { prisma } from ".";

export class PrismaUsersRepository implements UsersRepository {
    async getByEmail(email: string) {
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (!user) return null

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash
        }
    }

    async getById(id: string) {
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        })

        if (!user) return null

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.password_hash
        }
    }
} 