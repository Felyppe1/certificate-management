import { describe, expect, it, vi } from 'vitest'
import { ConfirmLinkGoogleToSystemAccountUseCase } from './confirm-link-google-to-system-account-use-case'
import { User, UserInput } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/write/isessions-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { UserNotFoundError as AuthUserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'
import { NoGoogleAccountError } from '../domain/error/validation-error/no-google-account-error'
import { ExternalAccountAlreadyExistsError } from '../domain/error/conflict-error/external-account-already-exists-error'

const transactionManagerStub: Pick<ITransactionManager, 'run'> = {
    async run<T>(work: () => Promise<T>): Promise<T> {
        return work()
    },
}

function createGoogleUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'google-user-id',
        email: null,
        isEmailVerified: false,
        name: 'Google User',
        passwordHash: null,
        credits: 300,
        externalAccounts: [
            new ExternalAccount({
                provider: 'GOOGLE',
                providerUserId: 'google-provider-id',
                email: 'user@example.com',
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                accessTokenExpiryDateTime: new Date(),
                refreshTokenExpiryDateTime: new Date(),
            }),
        ],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

function createSystemUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'system-user-id',
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'System User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

describe('ConfirmLinkGoogleToSystemAccountUseCase', () => {
    it('deve lançar erro quando o usuário do Google não é encontrado', async () => {
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update' | 'delete'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            getByEmail: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        }

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            usersRepository,
            { save: vi.fn() },
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(AuthUserNotFoundError)

        expect(usersRepository.delete).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não tem conta Google', async () => {
        const userSemGoogle = createSystemUser()
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update' | 'delete'
        > = {
            getById: vi.fn().mockResolvedValue(userSemGoogle),
            getByEmail: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        }

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            usersRepository,
            { save: vi.fn() },
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ userId: userSemGoogle.getId() }),
        ).rejects.toThrow(NoGoogleAccountError)
    })

    it('deve lançar erro quando não existe conta do sistema com o mesmo email', async () => {
        const googleUser = createGoogleUser()
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update' | 'delete'
        > = {
            getById: vi.fn().mockResolvedValue(googleUser),
            getByEmail: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
            delete: vi.fn(),
        }

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            usersRepository,
            { save: vi.fn() },
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ userId: googleUser.getId() }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro quando a conta do sistema já tem Google vinculado', async () => {
        const googleUser = createGoogleUser()
        const systemUserComGoogle = createSystemUser({
            externalAccounts: [
                new ExternalAccount({
                    provider: 'GOOGLE',
                    providerUserId: 'outro-google-id',
                    email: 'user@example.com',
                    accessToken: 'at',
                    refreshToken: 'rt',
                    accessTokenExpiryDateTime: new Date(),
                    refreshTokenExpiryDateTime: new Date(),
                }),
            ],
        })
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update' | 'delete'
        > = {
            getById: vi.fn().mockResolvedValue(googleUser),
            getByEmail: vi.fn().mockResolvedValue(systemUserComGoogle),
            update: vi.fn(),
            delete: vi.fn(),
        }

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            usersRepository,
            { save: vi.fn() },
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ userId: googleUser.getId() }),
        ).rejects.toThrow(ExternalAccountAlreadyExistsError)

        expect(usersRepository.delete).not.toHaveBeenCalled()
    })

    it('deve vincular conta do Google ao usuário do sistema com sucesso', async () => {
        const googleUser = createGoogleUser()
        const systemUser = createSystemUser()
        const sessionsRepository: Pick<ISessionsRepository, 'save'> = {
            save: vi.fn(),
        }
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update' | 'delete'
        > = {
            getById: vi.fn().mockResolvedValue(googleUser),
            getByEmail: vi.fn().mockResolvedValue(systemUser),
            update: vi.fn(),
            delete: vi.fn(),
        }

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            usersRepository,
            sessionsRepository,
            transactionManagerStub,
        )

        const token = await useCase.execute({ userId: googleUser.getId() })

        expect(token).toBeDefined()
        expect(usersRepository.delete).toHaveBeenCalledWith(googleUser.getId())
        expect(usersRepository.update).toHaveBeenCalledWith(systemUser)
        expect(sessionsRepository.save).toHaveBeenCalledOnce()
        expect(systemUser.hasExternalAccount('GOOGLE')).toBe(true)
    })
})
