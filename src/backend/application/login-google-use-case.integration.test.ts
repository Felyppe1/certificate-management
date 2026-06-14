import { describe, it, expect, vi } from 'vitest'
import { LoginGoogleUseCase } from '@/backend/application/login-google-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'
import { UserNotFoundError } from '@/backend/domain/error/authentication-error/user-not-found-error'
import { ExternalAccountAlreadyExistsError } from '@/backend/domain/error/conflict-error/external-account-already-exists-error'
import { prisma } from '@/tests/setup.integration'

const FUTURE_DATE = new Date(Date.now() + 60 * 60 * 1000)

const REQUIRED_SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly',
]

const GOOGLE_TOKEN = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiryDateTime: FUTURE_DATE,
    scopes: REQUIRED_SCOPES,
    idToken: 'id-token',
}

const GOOGLE_USER = {
    email: 'google@test.com',
    name: 'Usuário Google',
    providerUserId: 'g-123',
}

function makeGatewayStub(overrides?: {
    token?: Partial<typeof GOOGLE_TOKEN>
    user?: Partial<typeof GOOGLE_USER>
}): Pick<IGoogleAuthGateway, 'getToken' | 'getUserInfo'> {
    return {
        getToken: vi.fn().mockResolvedValue({ ...GOOGLE_TOKEN, ...overrides?.token }),
        getUserInfo: vi.fn().mockResolvedValue({ ...GOOGLE_USER, ...overrides?.user }),
    }
}

function makeUseCase(gatewayStub: Pick<IGoogleAuthGateway, 'getToken' | 'getUserInfo'>) {
    return new LoginGoogleUseCase(
        new PrismaUsersRepository(prisma),
        new PrismaSessionsRepository(prisma),
        gatewayStub,
        new PrismaTransactionManager(prisma),
    )
}

async function seedUserWithGoogleAccount(userId: string) {
    await prisma.user.create({
        data: {
            id: userId,
            name: 'Usuário Google',
            email: null,
            password_hash: null,
            credits: 300,
            ExternalUserAccount: {
                create: {
                    provider: 'GOOGLE',
                    provider_user_id: 'g-123',
                    email: GOOGLE_USER.email,
                    access_token: 'token-antigo',
                    refresh_token: 'refresh-antigo',
                    access_token_expiry_datetime: FUTURE_DATE,
                },
            },
        },
    })
}

describe('LoginGoogleUseCase (Integration)', () => {
    describe('primeiro acesso via Google', () => {
        it('deve salvar o novo usuário, a conta Google e a sessão no banco com os dados corretos', async () => {
            const gateway = makeGatewayStub()
            await makeUseCase(gateway).execute({ code: 'auth-code', reAuthenticate: false })

            const account = await prisma.externalUserAccount.findFirstOrThrow({
                where: { provider_user_id: GOOGLE_USER.providerUserId, provider: 'GOOGLE' },
            })
            const user = await prisma.user.findUniqueOrThrow({ where: { id: account.user_id } })
            const session = await prisma.session.findFirst({ where: { user_id: account.user_id } })

            expect(user).toMatchObject({
                name: GOOGLE_USER.name,
                email: null,
                is_email_verified: false,
                credits: 300,
            })

            expect(account).toMatchObject({
                provider: 'GOOGLE',
                provider_user_id: GOOGLE_USER.providerUserId,
                email: GOOGLE_USER.email,
                access_token: GOOGLE_TOKEN.accessToken,
                refresh_token: GOOGLE_TOKEN.refreshToken,
                access_token_expiry_datetime: GOOGLE_TOKEN.accessTokenExpiryDateTime,
            })

            expect(session!.token).toBeTruthy()
            expect(session).toMatchObject({ user_id: account.user_id })
            expect(session!.expires_at.getTime()).toBeGreaterThan(Date.now())
        })

        it('deve atualizar os tokens da conta Google de um usuário já cadastrado', async () => {
            await seedUserWithGoogleAccount('user-existente')

            const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000)
            const gateway = makeGatewayStub({
                token: { accessToken: 'token-novo', accessTokenExpiryDateTime: newExpiry },
            })
            await makeUseCase(gateway).execute({ code: 'auth-code', reAuthenticate: false })

            const account = await prisma.externalUserAccount.findFirst({
                where: { provider_user_id: 'g-123' },
            })
            expect(account).toMatchObject({
                access_token: 'token-novo',
                access_token_expiry_datetime: newExpiry,
            })
        })

        it('deve retornar a sugestão de vínculo de e-mail quando existe usuário de sistema com mesmo e-mail', async () => {
            await prisma.user.create({
                data: {
                    id: 'user-sistema',
                    email: GOOGLE_USER.email,
                    password_hash: 'hash',
                    name: 'Usuário Sistema',
                    credits: 300,
                },
            })

            const gateway = makeGatewayStub()
            const result = await makeUseCase(gateway).execute({ code: 'auth-code', reAuthenticate: false })

            expect(result.suggestLinkingEmail).toBe(GOOGLE_USER.email)
        })
    })

    describe('vinculação de conta Google a usuário de sistema', () => {
        it('deve salvar a conta Google vinculada ao usuário e criar sessão no banco', async () => {
            await prisma.user.create({
                data: {
                    id: 'user-sistema',
                    email: 'sistema@test.com',
                    password_hash: 'hash',
                    name: 'Usuário Sistema',
                    credits: 300,
                },
            })

            const gateway = makeGatewayStub({ user: { providerUserId: 'g-novo' } })
            await makeUseCase(gateway).execute({
                code: 'auth-code',
                reAuthenticate: true,
                userId: 'user-sistema',
            })

            const account = await prisma.externalUserAccount.findFirst({
                where: { user_id: 'user-sistema', provider: 'GOOGLE' },
            })
            const session = await prisma.session.findFirst({ where: { user_id: 'user-sistema' } })

            expect(account).toMatchObject({
                provider: 'GOOGLE',
                provider_user_id: 'g-novo',
                email: GOOGLE_USER.email,
                access_token: GOOGLE_TOKEN.accessToken,
                refresh_token: GOOGLE_TOKEN.refreshToken,
                access_token_expiry_datetime: GOOGLE_TOKEN.accessTokenExpiryDateTime,
            })

            expect(session!.token).toBeTruthy()
            expect(session).toMatchObject({ user_id: 'user-sistema' })
            expect(session!.expires_at.getTime()).toBeGreaterThan(Date.now())
        })

        it('deve atualizar os tokens ao re-vincular conta Google já associada ao usuário', async () => {
            await seedUserWithGoogleAccount('user-existente')

            const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000)
            const gateway = makeGatewayStub({
                token: { accessToken: 'token-reauth', accessTokenExpiryDateTime: newExpiry },
            })
            await makeUseCase(gateway).execute({
                code: 'auth-code',
                reAuthenticate: true,
                userId: 'user-existente',
            })

            const account = await prisma.externalUserAccount.findFirst({
                where: { user_id: 'user-existente' },
            })
            expect(account).toMatchObject({
                access_token: 'token-reauth',
                access_token_expiry_datetime: newExpiry,
            })
        })

        it('deve lançar erro quando a conta Google já está associada a outro usuário', async () => {
            await seedUserWithGoogleAccount('user-dono')

            await prisma.user.create({
                data: {
                    id: 'user-outro',
                    name: 'Outro Usuário',
                    email: null,
                    password_hash: null,
                    credits: 300,
                },
            })

            const gateway = makeGatewayStub()
            await expect(
                makeUseCase(gateway).execute({
                    code: 'auth-code',
                    reAuthenticate: true,
                    userId: 'user-outro',
                }),
            ).rejects.toThrow(ExternalAccountAlreadyExistsError)
        })

        it('deve lançar erro quando o usuário informado não existe', async () => {
            const gateway = makeGatewayStub()

            await expect(
                makeUseCase(gateway).execute({
                    code: 'auth-code',
                    reAuthenticate: true,
                    userId: 'user-inexistente',
                }),
            ).rejects.toThrow(UserNotFoundError)
        })
    })
})