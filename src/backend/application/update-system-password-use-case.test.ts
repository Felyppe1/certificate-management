
import { describe, expect, it, vi } from 'vitest'
import { UpdateSystemPasswordUseCase } from './update-system-password-use-case'
import { User, UserInput } from '../domain/user'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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
    it('deve lançar erro quando o usuário não é encontrado', async () => {
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new UpdateSystemPasswordUseCase(usersRepository)

        await expect(
            useCase.execute({
                userId: 'id-inexistente',
                currentPassword: 'qualquer',
                newPassword: 'nova',
            }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a senha atual está incorreta', async () => {
        const user = createUser({
            passwordHash: await bcrypt.hash('senha-correta', 10),
        })
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new UpdateSystemPasswordUseCase(usersRepository)

        await expect(
            useCase.execute({
                userId: user.getId(),
                currentPassword: 'senha-errada',
                newPassword: 'nova-senha',
            }),
        ).rejects.toThrow(CurrentPasswordIncorrectError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve atualizar a senha com sucesso', async () => {
        const user = createUser({
            passwordHash: await bcrypt.hash('senha-atual', 10),
        })
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new UpdateSystemPasswordUseCase(usersRepository)

        await useCase.execute({
            userId: user.getId(),
            currentPassword: 'senha-atual',
            newPassword: 'senha-nova',
        })

        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(await user.comparePassword('senha-nova')).toBe(true)
    })
})