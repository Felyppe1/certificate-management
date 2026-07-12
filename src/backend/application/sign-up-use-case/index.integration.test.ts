import { describe, it, expect, vi } from 'vitest'
import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { INotificationGateway } from '@/backend/application/interfaces/gateway/inotification-gateway'
import { UserAlreadyExistsError } from '@/backend/domain/error/conflict-error/user-already-exists-error'
import { prisma } from '@/tests/setup.integration'

const FUTURE_DATE = new Date(Date.now() + 60 * 60 * 1000)

function makeNotificationStub() {
    const stub: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn().mockResolvedValue(undefined),
    }
    return stub
}

function makeUseCase(notificationStub = makeNotificationStub()) {
    return new SignUpUseCase(
        new PrismaUsersRepository(prisma),
        notificationStub,
    )
}

describe('SignUpUseCase (Integration)', () => {
    it('deve salvar o usuário e o código de verificação de e-mail no banco com os dados corretos', async () => {
        await makeUseCase().execute({
            name: 'Novo Usuário',
            email: 'novo@test.com',
            password: 'senha123',
        })

        const user = await prisma.user.findFirstOrThrow({
            where: { email: 'novo@test.com' },
        })
        const code = await prisma.emailVerificationCode.findFirst({
            where: { user_id: user.id },
        })

        expect(user).toMatchObject({
            name: 'Novo Usuário',
            email: 'novo@test.com',
            is_email_verified: false,
            credits: 300,
        })
        expect(code).not.toBeNull()
        expect(code!.expires_at.getTime()).toBeGreaterThan(Date.now())
    })

    it('deve enviar e-mail de verificação para o endereço cadastrado', async () => {
        const notificationStub = makeNotificationStub()

        await makeUseCase(notificationStub).execute({
            name: 'Novo Usuário',
            email: 'novo@test.com',
            password: 'senha123',
        })

        expect(notificationStub.sendEmail).toHaveBeenCalledOnce()
        expect(notificationStub.sendEmail).toHaveBeenCalledWith(
            'novo@test.com',
            expect.any(String),
            expect.any(String),
            expect.any(String),
        )
    })

    it('deve retornar sugestão de vínculo com Google quando existe conta Google com mesmo e-mail', async () => {
        await prisma.user.create({
            data: {
                id: 'google-user',
                email: null,
                password_hash: null,
                name: 'Usuário Google',
                credits: 300,
                ExternalUserAccount: {
                    create: {
                        provider: 'GOOGLE',
                        provider_user_id: 'g-123',
                        email: 'novo@test.com',
                        access_token: 'token',
                        refresh_token: 'refresh',
                        access_token_expiry_datetime: FUTURE_DATE,
                    },
                },
            },
        })

        const result = await makeUseCase().execute({
            name: 'Novo Usuário',
            email: 'novo@test.com',
            password: 'senha123',
        })

        expect(result.googleLinkingSuggestion).toBe(true)
    })

    it('deve retornar sem sugestão de vínculo quando não existe conta Google com mesmo e-mail', async () => {
        const result = await makeUseCase().execute({
            name: 'Novo Usuário',
            email: 'novo@test.com',
            password: 'senha123',
        })

        expect(result.googleLinkingSuggestion).toBe(false)
    })

    it('deve lançar erro quando e-mail já está cadastrado', async () => {
        await prisma.user.create({
            data: {
                id: 'user-existente',
                email: 'novo@test.com',
                password_hash: 'qualquer-hash',
                name: 'Usuário Existente',
                credits: 300,
            },
        })

        await expect(
            makeUseCase().execute({
                name: 'Outro Usuário',
                email: 'novo@test.com',
                password: 'senha123',
            }),
        ).rejects.toThrow(UserAlreadyExistsError)
    })
})
