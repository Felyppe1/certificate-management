import { describe, it, expect } from 'vitest'
import { ValidateResetPasswordCodeUseCase } from '@/backend/application/valida-reset-password-code-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { UserNotFoundError } from '@/backend/domain/error/not-found-error/user-not-found-error'
import { ResetPasswordCodeExpiredError } from '@/backend/domain/error/forbidden-error/reset-password-code-expired-error'
import { ResetPasswordCodeInvalidError } from '@/backend/domain/error/forbidden-error/reset-password-code-invalid-error'
import { prisma } from '@/tests/setup.integration'

const EMAIL = 'usuario@test.com'
const CODE = '654321'
const FUTURE_DATE = new Date(Date.now() + 15 * 60 * 1000)
const PAST_DATE = new Date(Date.now() - 15 * 60 * 1000)

function makeUseCase() {
    return new ValidateResetPasswordCodeUseCase(new PrismaUsersRepository(prisma))
}

async function seedUserWithResetCode(options: { expiresAt: Date } = { expiresAt: FUTURE_DATE }) {
    await prisma.user.create({
        data: {
            id: 'user-1',
            email: EMAIL,
            password_hash: 'qualquer-hash',
            is_email_verified: true,
            name: 'Usuário Teste',
            credits: 300,
            reset_password_code: CODE,
            reset_password_expires_at: options.expiresAt,
        },
    })
}

describe('ValidateResetPasswordCodeUseCase (Integration)', () => {
    it('deve concluir sem erros quando o código de redefinição é válido', async () => {
        await seedUserWithResetCode()

        await expect(
            makeUseCase().execute({ email: EMAIL, code: CODE }),
        ).resolves.toBeUndefined()
    })

    it('deve lançar erro quando e-mail não existe', async () => {
        await expect(
            makeUseCase().execute({ email: 'inexistente@test.com', code: CODE }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro quando código está expirado', async () => {
        await seedUserWithResetCode({ expiresAt: PAST_DATE })

        await expect(
            makeUseCase().execute({ email: EMAIL, code: CODE }),
        ).rejects.toThrow(ResetPasswordCodeExpiredError)
    })

    it('deve lançar erro quando código está incorreto', async () => {
        await seedUserWithResetCode()

        await expect(
            makeUseCase().execute({ email: EMAIL, code: '000000' }),
        ).rejects.toThrow(ResetPasswordCodeInvalidError)
    })
})