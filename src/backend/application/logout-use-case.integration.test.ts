import { describe, it, expect } from 'vitest'
import { LogoutUseCase } from '@/backend/application/logout-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { SessionNotFoundError } from '@/backend/domain/error/authentication-error/session-not-found-error'
import { prisma } from '@/tests/setup.integration'

const SESSION_TOKEN = 'token-teste-abc123'
const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

function makeUseCase() {
    return new LogoutUseCase(new PrismaSessionsRepository(prisma))
}

describe('LogoutUseCase (Integration)', () => {
    it('deve remover a sessão do banco', async () => {
        await prisma.user.create({
            data: { id: 'user-1', name: 'Usuário', email: null, password_hash: null, credits: 300 },
        })
        await prisma.session.create({
            data: { token: SESSION_TOKEN, user_id: 'user-1', expires_at: FUTURE_DATE },
        })

        await makeUseCase().execute(SESSION_TOKEN)

        const session = await prisma.session.findUnique({
            where: { token: SESSION_TOKEN },
        })
        expect(session).toBeNull()
    })

    it('deve lançar erro quando a sessão não existe', async () => {
        await expect(makeUseCase().execute('token-inexistente')).rejects.toThrow(
            SessionNotFoundError,
        )
    })
})