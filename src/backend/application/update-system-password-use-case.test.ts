import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { UpdateSystemPasswordUseCase } from './update-system-password-use-case'
import { User, UserInput } from '../domain/user'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { CurrentPasswordIncorrectError } from '../domain/error/validation-error/current-password-incorrect-error'
import bcrypt from 'bcrypt'

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

describe('UpdateSystemPasswordUseCase', () => {
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

        const useCase = new UpdateSystemPasswordUseCase(usersRepositoryMock)

        await expect(
            useCase.execute({
                userId: 'id-inexistente',
                currentPassword: 'qualquer',
                newPassword: 'nova',
            }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a senha atual está incorreta', async () => {
        const user = createUser({
            passwordHash: await bcrypt.hash('senha-correta', 10),
        })
        usersRepositoryMock.getById.mockResolvedValue(user)

        const useCase = new UpdateSystemPasswordUseCase(usersRepositoryMock)

        await expect(
            useCase.execute({
                userId: user.getId(),
                currentPassword: 'senha-errada',
                newPassword: 'nova-senha',
            }),
        ).rejects.toThrow(CurrentPasswordIncorrectError)

        expect(usersRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar a senha com sucesso', async () => {
        const user = createUser({
            passwordHash: await bcrypt.hash('senha-atual', 10),
        })
        usersRepositoryMock.getById.mockResolvedValue(user)

        const useCase = new UpdateSystemPasswordUseCase(usersRepositoryMock)

        await useCase.execute({
            userId: user.getId(),
            currentPassword: 'senha-atual',
            newPassword: 'senha-nova',
        })

        expect(usersRepositoryMock.update).toHaveBeenCalledWith(user)
        expect(await user.comparePassword('senha-nova')).toBe(true)
    })
})
