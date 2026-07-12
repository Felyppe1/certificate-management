import { describe, it, expect } from 'vitest'
import bcrypt from 'bcrypt'
import { ResetPasswordUseCase } from '@/backend/application/reset-password-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { UserNotFoundError } from '@/backend/domain/error/not-found-error/user-not-found-error'
import { ResetPasswordCodeExpiredError } from '@/backend/domain/error/forbidden-error/reset-password-code-expired-error'
import { ResetPasswordCodeInvalidError } from '@/backend/domain/error/forbidden-error/reset-password-code-invalid-error'
import { prisma } from '@/tests/setup.integration'

const EMAIL = 'usuario@test.com'
const CODE = '654321'
const NOVA_SENHA = 'novaSenha123'
const FUTURE_DATE = new Date(Date.now() + 15 * 60 * 1000)
const PAST_DATE = new Date(Date.now() - 15 * 60 * 1000)

function makeUseCase() {
    return new ResetPasswordUseCase(new PrismaUsersRepository(prisma))
}

async function seedUserWithResetCode(
    options: { expiresAt: Date } = { expiresAt: FUTURE_DATE },
) {
    await prisma.user.create({
        data: {
            id: 'user-1',
            email: EMAIL,
            password_hash: 'hash-antigo',
            is_email_verified: true,
            name: 'Usuário Teste',
            credits: 300,
            reset_password_code: CODE,
            reset_password_expires_at: options.expiresAt,
        },
    })
}

describe('ResetPasswordUseCase (Integration)', () => {
    it('deve atualizar a senha e limpar o código de redefinição no banco', async () => {
        await seedUserWithResetCode()

        await makeUseCase().execute({
            email: EMAIL,
            code: CODE,
            newPassword: NOVA_SENHA,
        })

        const user = await prisma.user.findUnique({ where: { id: 'user-1' } })
        expect(user!.password_hash).not.toBe('hash-antigo')
        const senhaValida = await bcrypt.compare(
            NOVA_SENHA,
            user!.password_hash!,
        )
        expect(senhaValida).toBe(true)
        expect(user).toMatchObject({
            reset_password_code: null,
            reset_password_expires_at: null,
        })
    })

    it('deve lançar erro quando e-mail não existe', async () => {
        await expect(
            makeUseCase().execute({
                email: 'inexistente@test.com',
                code: CODE,
                newPassword: NOVA_SENHA,
            }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro quando código está expirado', async () => {
        await seedUserWithResetCode({ expiresAt: PAST_DATE })

        await expect(
            makeUseCase().execute({
                email: EMAIL,
                code: CODE,
                newPassword: NOVA_SENHA,
            }),
        ).rejects.toThrow(ResetPasswordCodeExpiredError)
    })

    it('deve lançar erro quando código está incorreto', async () => {
        await seedUserWithResetCode()

        await expect(
            makeUseCase().execute({
                email: EMAIL,
                code: '000000',
                newPassword: NOVA_SENHA,
            }),
        ).rejects.toThrow(ResetPasswordCodeInvalidError)
    })
})
