import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { UpdateUserBasicDataUseCase } from '@/backend/application/update-user-basic-data-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'

describe('UpdateUserBasicDataUseCase (Integração)', () => {
    it('deve salvar o nome atualizado no banco', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hash',
                name: 'Old Name',
            },
        })

        const useCase = new UpdateUserBasicDataUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ userId: 'user-1', name: 'New Name' })

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        expect(user?.name).toBe('New Name')
    })
})
