import { describe, expect, it } from 'vitest'
import bcrypt from 'bcrypt'
import { prisma } from '@/tests/setup.integration'
import { UpdateSystemPasswordUseCase } from '@/backend/application/update-system-password-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'

describe('UpdateSystemPasswordUseCase (Integração)', () => {
    it('deve atualizar o hash da senha no banco', async () => {
        const currentPassword = 'current-password'
        const currentHash = await bcrypt.hash(currentPassword, 10)

        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: currentHash,
                name: 'Test User',
            },
        })

        const useCase = new UpdateSystemPasswordUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({
            userId: 'user-1',
            currentPassword,
            newPassword: 'new-password',
        })

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        expect(user?.password_hash).not.toBeNull()
        expect(await bcrypt.compare('new-password', user!.password_hash!)).toBe(
            true,
        )
    })
})