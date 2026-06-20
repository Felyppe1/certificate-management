import { beforeEach, describe, expect, it, vi, Mock } from 'vitest'
import { LinkSystemToGoogleAccountUseCase } from './link-system-to-google-account-use-case'
import { User, UserInput } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { SystemLoginNotEnabledError } from '../domain/error/validation-error/system-login-not-enabled-error'
import { ExternalAccountNotFoundError } from '../domain/error/not-found-error/external-account-not-found-error'

const transactionManagerStub: Pick<ITransactionManager, 'run'> = {
    async run<T>(work: () => Promise<T>): Promise<T> {
        return work()
    },
}

function createGoogleUser(): User {
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

describe('LinkSystemToGoogleAccountUseCase', () => {
    let usersRepositoryMock: {
        getById: Mock<IUsersRepository['getById']>
        getByExternalAccountEmail: Mock<
            IUsersRepository['getByExternalAccountEmail']
        >
        update: Mock<IUsersRepository['update']>
        delete: Mock<IUsersRepository['delete']>
    }
    let sessionsRepositoryMock: { save: Mock<ISessionsRepository['save']> }

    beforeEach(() => {
        usersRepositoryMock = {
            getById: vi.fn().mockResolvedValue(null),
            getByExternalAccountEmail: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
            delete: vi.fn(),
        }
        sessionsRepositoryMock = {
            save: vi.fn(),
        }
    })

    it('deve lançar erro quando o usuário do sistema não for encontrado', async () => {
        usersRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new LinkSystemToGoogleAccountUseCase(
            usersRepositoryMock,
            sessionsRepositoryMock,
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ currentUserId: 'id-inexistente' }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepositoryMock.delete).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não tem login por email', async () => {
        const userWithoutEmail = createSystemUser({
            email: null,
            passwordHash: null,
            externalAccounts: [
                new ExternalAccount({
                    provider: 'GOOGLE',
                    providerUserId: 'gid',
                    email: 'user@example.com',
                    accessToken: 'at',
                    refreshToken: 'rt',
                    accessTokenExpiryDateTime: new Date(),
                    refreshTokenExpiryDateTime: new Date(),
                }),
            ],
        })
        usersRepositoryMock.getById.mockResolvedValue(userWithoutEmail)

        const useCase = new LinkSystemToGoogleAccountUseCase(
            usersRepositoryMock,
            sessionsRepositoryMock,
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ currentUserId: userWithoutEmail.getId() }),
        ).rejects.toThrow(SystemLoginNotEnabledError)
    })

    it('deve lançar erro quando não existe conta Google com o mesmo email', async () => {
        const systemUser = createSystemUser()
        usersRepositoryMock.getById.mockResolvedValue(systemUser)
        usersRepositoryMock.getByExternalAccountEmail.mockResolvedValue(null)

        const useCase = new LinkSystemToGoogleAccountUseCase(
            usersRepositoryMock,
            sessionsRepositoryMock,
            transactionManagerStub,
        )

        await expect(
            useCase.execute({ currentUserId: systemUser.getId() }),
        ).rejects.toThrow(ExternalAccountNotFoundError)
    })

    it('deve vincular conta do sistema com conta Google com sucesso', async () => {
        const systemUser = createSystemUser()
        const googleUser = createGoogleUser()
        usersRepositoryMock.getById.mockResolvedValue(systemUser)
        usersRepositoryMock.getByExternalAccountEmail.mockResolvedValue(
            googleUser,
        )

        const useCase = new LinkSystemToGoogleAccountUseCase(
            usersRepositoryMock,
            sessionsRepositoryMock,
            transactionManagerStub,
        )

        const token = await useCase.execute({
            currentUserId: systemUser.getId(),
        })

        expect(token).toBeDefined()
        expect(usersRepositoryMock.delete).toHaveBeenCalledWith(
            systemUser.getId(),
        )
        expect(usersRepositoryMock.update).toHaveBeenCalledWith(googleUser)
        expect(sessionsRepositoryMock.save).toHaveBeenCalledWith(
            expect.objectContaining({ userId: googleUser.getId() }),
        )
    })
})
