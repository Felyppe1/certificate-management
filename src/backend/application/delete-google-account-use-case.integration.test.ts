import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { DeleteAccountUseCase } from '@/backend/application/delete-google-account-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/gateway/igoogle-auth-gateway'

class GoogleGatewayStub
    implements Pick<IGoogleAuthGateway, 'revokeRefreshToken'>
{
    async revokeRefreshToken(_refreshToken: string): Promise<void> {}
}

describe('DeleteAccountUseCase (Integração)', () => {
    it('deve excluir o usuário do banco', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hash',
                name: 'Test User',
            },
        })

        const useCase = new DeleteAccountUseCase(
            new PrismaUsersRepository(prisma),
            new GoogleGatewayStub(),
        )

        await useCase.execute({ userId: 'user-1' })

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        expect(user).toBeNull()
    })
})
