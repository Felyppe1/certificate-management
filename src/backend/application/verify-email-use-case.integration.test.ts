import { describe, it, expect } from 'vitest'
import { VerifyEmailUseCase } from '@/backend/application/verify-email-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/interface-adapters/repository/prisma/prisma-transaction-manager'
import { EmailVerificationCodeNotFoundError } from '@/backend/domain/error/not-found-error/email-verification-code-not-found-error'
import { VerificationCodeExpiredError } from '@/backend/domain/error/forbidden-error/verification-code-expired-error'
import { VerificationCodeInvalidError } from '@/backend/domain/error/forbidden-error/verification-code-invalid-error'
import { prisma } from '@/tests/setup.integration'

const EMAIL = 'usuario@test.com'
const CODE = '123456'
const FUTURE_DATE = new Date(Date.now() + 15 * 60 * 1000)
const PAST_DATE = new Date(Date.now() - 15 * 60 * 1000)

function makeUseCase() {
    return new VerifyEmailUseCase(
        new PrismaUsersRepository(prisma),
        new PrismaSessionsRepository(prisma),
        new PrismaTransactionManager(prisma),
    )
}

async function seedUserWithCode(
    options: { expiresAt: Date; code?: string } = { expiresAt: FUTURE_DATE },
) {
    await prisma.user.create({
        data: {
            id: 'user-1',
            email: EMAIL,
            password_hash: 'qualquer-hash',
            is_email_verified: false,
            name: 'Usuário Teste',
            credits: 300,
            EmailVerificationCode: {
                create: {
                    code: options.code ?? CODE,
                    expires_at: options.expiresAt,
                },
            },
        },
    })
}

describe('VerifyEmailUseCase (Integration)', () => {
    it('deve marcar o e-mail como verificado, criar sessão e remover o código de verificação', async () => {
        await seedUserWithCode()

        await makeUseCase().execute({ email: EMAIL, code: CODE })

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        const session = await prisma.session.findFirst({
            where: { user_id: 'user-1' },
        })
        const code = await prisma.emailVerificationCode.findFirst({
            where: { user_id: 'user-1' },
        })

        expect(user).toMatchObject({ is_email_verified: true })
        expect(session!.token).toBeTruthy()
        expect(session).toMatchObject({ user_id: 'user-1' })
        expect(session!.expires_at.getTime()).toBeGreaterThan(Date.now())
        expect(code).toBeNull()
    })

    it('deve lançar erro quando usuário não existe', async () => {
        await expect(
            makeUseCase().execute({
                email: 'inexistente@test.com',
                code: CODE,
            }),
        ).rejects.toThrow(EmailVerificationCodeNotFoundError)
    })

    it('deve lançar erro quando código está expirado', async () => {
        await seedUserWithCode({ expiresAt: PAST_DATE })

        await expect(
            makeUseCase().execute({ email: EMAIL, code: CODE }),
        ).rejects.toThrow(VerificationCodeExpiredError)
    })

    it('deve lançar erro quando código está incorreto', async () => {
        await seedUserWithCode()

        await expect(
            makeUseCase().execute({ email: EMAIL, code: '999999' }),
        ).rejects.toThrow(VerificationCodeInvalidError)
    })
})
