import { describe, it, expect, beforeAll } from 'vitest'
import bcrypt from 'bcrypt'
import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { IncorrectCredentialsError } from '@/backend/domain/error/authentication-error/incorrect-credentials-error'
import { EmailNotVerifiedError } from '@/backend/domain/error/forbidden-error/email-not-verified-error'
import { prisma } from '@/tests/setup.integration'

const EMAIL = 'usuario@test.com'
const SENHA = 'senha123'
let passwordHash: string

beforeAll(async () => {
    passwordHash = await bcrypt.hash(SENHA, 10)
})

function makeUseCase() {
    return new LoginUseCase(
        new PrismaUsersRepository(prisma),
        new PrismaSessionsRepository(prisma),
    )
}

describe('LoginUseCase (Integration)', () => {
    it('deve criar sessão e retornar os dados de autenticação para credenciais válidas', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: EMAIL,
                password_hash: passwordHash,
                is_email_verified: true,
                name: 'Usuário Teste',
                credits: 300,
            },
        })

        const result = await makeUseCase().execute(EMAIL, SENHA)

        const session = await prisma.session.findFirst({
            where: { user_id: 'user-1' },
        })
        expect(session!.token).toBeTruthy()
        expect(session).toMatchObject({ user_id: 'user-1' })
        expect(session!.expires_at.getTime()).toBeGreaterThan(Date.now())
        expect(result.token).toBeTruthy()
        expect(result.user).toMatchObject({
            id: 'user-1',
            email: EMAIL,
            name: 'Usuário Teste',
        })
    })

    it('deve lançar erro quando e-mail não existe', async () => {
        await expect(
            makeUseCase().execute('inexistente@test.com', SENHA),
        ).rejects.toThrow(IncorrectCredentialsError)
    })

    it('deve lançar erro quando senha está incorreta', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: EMAIL,
                password_hash: passwordHash,
                is_email_verified: true,
                name: 'Usuário Teste',
                credits: 300,
            },
        })

        await expect(
            makeUseCase().execute(EMAIL, 'senha-errada'),
        ).rejects.toThrow(IncorrectCredentialsError)
    })

    it('deve lançar erro quando e-mail não foi verificado', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: EMAIL,
                password_hash: passwordHash,
                is_email_verified: false,
                name: 'Usuário Teste',
                credits: 300,
            },
        })

        await expect(makeUseCase().execute(EMAIL, SENHA)).rejects.toThrow(
            EmailNotVerifiedError,
        )
    })
})
