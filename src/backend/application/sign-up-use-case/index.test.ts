import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SignUpUseCase } from './index'
import { UserAlreadyExistsError } from '../../domain/error/conflict-error/user-already-exists-error'
import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { INotificationGateway } from '../interfaces/inotification-gateway'

describe('SignUpUseCase', () => {
    const usersRepository: Pick<
        IUsersRepository,
        'getByEmail' | 'getByExternalAccountEmail' | 'save'
    > = {
        getByEmail: vi.fn(),
        getByExternalAccountEmail: vi.fn(),
        save: vi.fn(),
    }

    const notificationGateway: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn(),
    }

    let useCase: SignUpUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new SignUpUseCase(usersRepository, notificationGateway)
    })

    it('deve lançar erro quando o e-mail já estiver cadastrado', async () => {
        vi.mocked(usersRepository.getByEmail).mockResolvedValue({
            getId: () => 'existing-id',
        } as any)

        await expect(
            useCase.execute({
                name: 'Usuário',
                email: 'existente@example.com',
                password: 'senha123',
            }),
        ).rejects.toThrow(UserAlreadyExistsError)
    })

    it('deve salvar o usuário e enviar e-mail de verificação no caminho feliz', async () => {
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(null)
        vi.mocked(usersRepository.getByExternalAccountEmail).mockResolvedValue(
            null,
        )
        vi.mocked(usersRepository.save).mockResolvedValue(undefined)

        await useCase.execute({
            name: 'Novo Usuário',
            email: 'novo@example.com',
            password: 'senha123',
        })

        expect(usersRepository.save).toHaveBeenCalledOnce()
        expect(notificationGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
            'novo@example.com',
            expect.any(String),
            expect.any(String),
            expect.any(String),
        )
    })

    it('deve retornar sugestão de vínculo com Google quando existir conta Google sem login de sistema', async () => {
        const googleUser = { hasSystemLogin: () => false }
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(null)
        vi.mocked(usersRepository.getByExternalAccountEmail).mockResolvedValue(
            googleUser as any,
        )
        vi.mocked(usersRepository.save).mockResolvedValue(undefined)

        const result = await useCase.execute({
            name: 'Novo Usuário',
            email: 'novo@example.com',
            password: 'senha123',
        })

        expect(result.googleLinkingSuggestion).toBe(true)
    })

    it('deve retornar sem sugestão de vínculo quando não existir conta Google com o mesmo e-mail', async () => {
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(null)
        vi.mocked(usersRepository.getByExternalAccountEmail).mockResolvedValue(
            null,
        )
        vi.mocked(usersRepository.save).mockResolvedValue(undefined)

        const result = await useCase.execute({
            name: 'Novo Usuário',
            email: 'novo@example.com',
            password: 'senha123',
        })

        expect(result.googleLinkingSuggestion).toBe(false)
    })
})
