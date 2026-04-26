import { describe, expect, it } from 'vitest'
import { Email, PROCESSING_STATUS_ENUM } from './email'
import { DATA_SOURCE_MIME_TYPE } from './data-source'

const validData = {
    certificateEmissionId: 'emissao-123',
    subject: 'Seu Certificado Chegou!',
    body: 'Olá, segue seu certificado.',
    emailColumn: 'Email',
    scheduledAt: new Date(),
    emailErrorType: null,
}

describe('Email Domain', () => {
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
    })
})
