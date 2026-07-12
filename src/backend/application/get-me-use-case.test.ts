import { beforeEach, describe, expect, it } from 'vitest'
import { GetMeUseCase } from './get-me-use-case'
import { User, UserInput } from '../domain/user'
import { EmailChangeCode } from '../domain/email-change-code'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'Test User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

describe('GetMeUseCase', () => {
    let usersRepositoryStub: Pick<IUsersRepository, 'getById'>

    beforeEach(() => {
        usersRepositoryStub = {
            getById: async () => null,
        }
    })

    it('deve lançar erro quando usuário não encontrado', async () => {
        usersRepositoryStub.getById = async () => null

        const useCase = new GetMeUseCase(usersRepositoryStub)

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve retornar os dados do usuário sem informações sensíveis', async () => {
        const user = createUser()
        usersRepositoryStub.getById = async () => user

        const useCase = new GetMeUseCase(usersRepositoryStub)

        const result = await useCase.execute({ userId: 'user-id' })

        expect(result.id).toBe('user-id')
        expect(result.email).toBe('user@example.com')
        expect(result.name).toBe('Test User')
        expect(result.credits).toBe(300)
        expect((result as any).passwordHash).toBeUndefined()
        expect(result.emailChangeCode).toBeNull()
    })

    it('deve retornar os dados do usuário com troca de email pendente com sucesso', async () => {
        const expiresAt = new Date(Date.now() + 60_000)
        const user = createUser({
            emailChangeCode: new EmailChangeCode({
                newEmail: 'new@example.com',
                code: '123456',
                expiresAt,
            }),
        })
        usersRepositoryStub.getById = async () => user

        const useCase = new GetMeUseCase(usersRepositoryStub)

        const result = await useCase.execute({ userId: 'user-id' })

        expect(result.emailChangeCode).toEqual({
            newEmail: 'new@example.com',
            expiresAt,
        })
    })
})
