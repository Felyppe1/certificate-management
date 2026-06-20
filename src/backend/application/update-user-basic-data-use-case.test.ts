import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { UpdateUserBasicDataUseCase } from './update-user-basic-data-use-case'
import { User, UserInput } from '../domain/user'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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

describe('UpdateUserBasicDataUseCase', () => {
    let usersRepositoryMock: {
        getById: Mock<IUsersRepository['getById']>
        update: Mock<IUsersRepository['update']>
    }

    beforeEach(() => {
        usersRepositoryMock = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }
    })

    it('deve lançar erro quando o usuário não é encontrado', async () => {
        usersRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new UpdateUserBasicDataUseCase(usersRepositoryMock)

        await expect(
            useCase.execute({ userId: 'id-inexistente', name: 'Novo Nome' }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o nome é inválido', async () => {
        const user = createUser()
        usersRepositoryMock.getById.mockResolvedValue(user)

        const useCase = new UpdateUserBasicDataUseCase(usersRepositoryMock)

        await expect(
            useCase.execute({ userId: user.getId(), name: 'AB' }),
        ).rejects.toThrow()

        expect(usersRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar o nome com sucesso', async () => {
        const user = createUser()
        usersRepositoryMock.getById.mockResolvedValue(user)

        const useCase = new UpdateUserBasicDataUseCase(usersRepositoryMock)

        await useCase.execute({ userId: user.getId(), name: 'Nome Atualizado' })

        expect(usersRepositoryMock.update).toHaveBeenCalledWith(user)
        expect(user.getName()).toBe('Nome Atualizado')
    })
})
