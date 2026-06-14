import { describe, it, expect, vi } from 'vitest'
import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'
import { GoogleAccountNotFoundError } from '@/backend/domain/error/forbidden-error/google-account-not-found-error'
import { prisma } from '@/tests/setup.integration'

const FUTURE_DATE = new Date(Date.now() + 60 * 60 * 1000)

async function seedUserWithGoogleAccount(options: {
    accessToken?: string
    accessTokenExpiryDatetime?: Date
} = {}) {
    await prisma.user.create({
        data: {
            id: 'user-1',
            name: 'Usuário Google',
            email: null,
            password_hash: null,
            credits: 300,
            ExternalUserAccount: {
                create: {
                    provider: 'GOOGLE',
                    provider_user_id: 'g-123',
                    email: 'google@test.com',
                    access_token: options.accessToken ?? 'token-atual',
                    refresh_token: 'refresh-token',
                    access_token_expiry_datetime: options.accessTokenExpiryDatetime ?? FUTURE_DATE,
                },
            },
        },
    })
}

describe('RefreshGoogleAccessTokenUseCase (Integration)', () => {
    it('deve retornar o token atual sem atualizar o banco quando não está expirado', async () => {
        await seedUserWithGoogleAccount({ accessToken: 'token-atual' })

        const gatewayStub: Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'> = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue(null),
        }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            new PrismaUsersRepository(prisma),
            gatewayStub,
        )

        const token = await useCase.execute({ userId: 'user-1' })

        expect(token).toBe('token-atual')
        const account = await prisma.externalUserAccount.findFirst({
            where: { user_id: 'user-1' },
        })
        expect(account).toMatchObject({ access_token: 'token-atual' })
    })

    it('deve atualizar o token no banco e retornar o novo token quando expirado', async () => {
        const pastDate = new Date(Date.now() - 60 * 1000)
        await seedUserWithGoogleAccount({
            accessToken: 'token-antigo',
            accessTokenExpiryDatetime: pastDate,
        })

        const newExpiry = new Date(Date.now() + 3600 * 1000)
        const gatewayStub: Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'> = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue({
                newAccessToken: 'token-novo',
                newAccessTokenExpiryDateTime: newExpiry,
            }),
        }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            new PrismaUsersRepository(prisma),
            gatewayStub,
        )

        const token = await useCase.execute({ userId: 'user-1' })

        expect(token).toBe('token-novo')
        const account = await prisma.externalUserAccount.findFirst({
            where: { user_id: 'user-1' },
        })
        expect(account).toMatchObject({ access_token: 'token-novo', access_token_expiry_datetime: newExpiry })
    })

    it('deve lançar erro quando usuário não tem conta Google', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                name: 'Usuário Sem Google',
                email: null,
                password_hash: null,
                credits: 300,
            },
        })

        const gatewayStub: Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'> = {
            checkOrGetNewAccessToken: vi.fn(),
        }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            new PrismaUsersRepository(prisma),
            gatewayStub,
        )

        await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
            GoogleAccountNotFoundError,
        )
    })
})