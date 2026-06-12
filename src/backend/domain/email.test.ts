import { describe, expect, it } from 'vitest'
import { Email, EMAIL_ERROR_TYPE_ENUM, PROCESSING_STATUS_ENUM } from './email'
import { EmailCreatedDomainEvent } from './events/email-created-domain-event'

const validData = {
    certificateEmissionId: 'emissao-123',
    subject: 'Seu Certificado Chegou!',
    body: 'Olá, segue seu certificado.',
    emailColumn: 'Email',
    scheduledAt: new Date(),
    emailErrorType: null,
}

describe('Email Domain', () => {
    describe('Criação do e-mail', () => {
        it('deve criar o e-mail com sucesso', () => {
            const email = Email.create(validData)

            expect(email.serialize().status).toBe(PROCESSING_STATUS_ENUM.PENDING)

            const events = email.getDomainEvents()
            expect(events).toHaveLength(1)
            expect(events[0]).toBeInstanceOf(EmailCreatedDomainEvent)
        })

        describe('Regras obrigatórias para criação', () => {
            it('deve exigir assunto para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: PROCESSING_STATUS_ENUM.PENDING,
                            subject: '',
                        }),
                ).toThrow('Email subject is required')
            })

            it('deve exigir conteúdo para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: PROCESSING_STATUS_ENUM.PENDING,
                            body: '',
                        }),
                ).toThrow('Email body is required')
            })

            it('deve exigir coluna de e-mail para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: PROCESSING_STATUS_ENUM.PENDING,
                            emailColumn: '',
                        }),
                ).toThrow('Email column is required')
            })

            it('deve exigir id da emissão de certificado para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: PROCESSING_STATUS_ENUM.PENDING,
                            certificateEmissionId: '',
                        }),
                ).toThrow('Email certificateEmissionId is required')
            })

            it('deve exigir data de agendamento definida para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: PROCESSING_STATUS_ENUM.PENDING,
                            scheduledAt: undefined as any,
                        }),
                ).toThrow('Email scheduledAt is required')
            })

            it('deve exigir status para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: '' as PROCESSING_STATUS_ENUM,
                        }),
                ).toThrow('Email status is required')
            })

            it('deve exigir tipo de erro definido para permitir cadastro do email', () => {
                expect(
                    () =>
                        new Email({
                            ...validData,
                            id: '1',
                            status: PROCESSING_STATUS_ENUM.PENDING,
                            emailErrorType: undefined as any,
                        }),
                ).toThrow('emailErrorType is required')
            })
        })
    })

    describe('Validação de destinatários', () => {
        it('deve permitir envio quando todos os destinatários informados forem válidos', () => {
            const validEmails = ['user@email.com']

            const result = Email.validateEmailColumnRecords(validEmails)

            expect(result).toBe(true)
        })

        it('deve impedir envio quando existir destinatário inválido na lista', () => {
            const invalidEmails = ['invalid-email']

            const result = Email.validateEmailColumnRecords(invalidEmails)

            expect(result).toBe(false)
        })

        it('deve impedir envio quando houver destinatário não preenchido', () => {
            const emptyEmails = ['']

            const result = Email.validateEmailColumnRecords(emptyEmails)

            expect(result).toBe(false)
        })
    })

    describe('Atualização do e-mail', () => {
        it('deve atualizar o status de processamento do e-mail', () => {
            const email = Email.create(validData)

            email.setProcessingStatus(PROCESSING_STATUS_ENUM.COMPLETED)

            expect(email.serialize().status).toBe(PROCESSING_STATUS_ENUM.COMPLETED)
        })

        it('deve definir o tipo de erro do e-mail', () => {
            const email = Email.create(validData)

            email.setEmailErrorType(EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR)

            expect(email.serialize().emailErrorType).toBe(EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR)
        })
    })
})