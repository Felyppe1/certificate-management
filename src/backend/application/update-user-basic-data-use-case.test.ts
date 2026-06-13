import { describe, expect, it, vi } from 'vitest'
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
    it('deve lançar erro quando o usuário não é encontrado', async () => {
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new UpdateUserBasicDataUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: 'id-inexistente', name: 'Novo Nome' }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o nome é inválido', async () => {
        const user = createUser()
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new UpdateUserBasicDataUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: user.getId(), name: 'AB' }),
        ).rejects.toThrow()

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve atualizar o nome com sucesso', async () => {
        const user = createUser()
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new UpdateUserBasicDataUseCase(usersRepository)

        await useCase.execute({ userId: user.getId(), name: 'Nome Atualizado' })

        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(user.getName()).toBe('Nome Atualizado')
    })
})