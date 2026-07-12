import { describe, expect, it } from 'vitest'
import { prisma } from '@/tests/setup.integration'
import { UnlinkExternalAccountUseCase } from '@/backend/application/unlink-external-account-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/gateway/igoogle-auth-gateway'

class GoogleGatewayStub
    implements Pick<IGoogleAuthGateway, 'revokeRefreshToken'>
{
    async revokeRefreshToken(_refreshToken: string): Promise<void> {}
}

describe('UnlinkExternalAccountUseCase (Integração)', () => {
    it('deve remover a conta externa do banco', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hash',
                name: 'Test User',
                is_email_verified: true,
                ExternalUserAccount: {
                    create: {
                        provider: 'GOOGLE',
                        provider_user_id: 'google-id-1',
                        email: 'user@gmail.com',
                        access_token: 'access-token',
                        refresh_token: 'refresh-token',
                        access_token_expiry_datetime: new Date(
                            Date.now() + 60 * 60 * 1000,
                        ),
                    },
                },
            },
        })

        const useCase = new UnlinkExternalAccountUseCase(
            new PrismaUsersRepository(prisma),
            new GoogleGatewayStub() as unknown as IGoogleAuthGateway,
        )

        await useCase.execute({ userId: 'user-1', provider: 'GOOGLE' })

        const externalAccount = await prisma.externalUserAccount.findFirst({
            where: { user_id: 'user-1', provider: 'GOOGLE' },
        })
        expect(externalAccount).toBeNull()
    })
})
