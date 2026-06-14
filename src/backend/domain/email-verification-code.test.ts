import { describe, expect, it } from 'vitest'
import { EmailVerificationCode } from './email-verification-code'

describe('EmailVerificationCode', () => {
    describe('Construção', () => {
        it('deve criar code válido com create()', () => {
            const code = EmailVerificationCode.create()

            expect(code.getCode()).toMatch(/^\d{6}$/)
            expect(code.getExpiresAt()).toBeInstanceOf(Date)
            expect(code.isExpired()).toBe(false)
        })

        describe('deve lançar erro com dados inválidos', () => {
            it('code ausente', () => {
                expect(
                    () =>
                        new EmailVerificationCode({
                            code: '',
                            expiresAt: new Date(),
                        }),
                ).toThrow('EmailVerificationCode code is required')
            })

            it('expiresAt ausente', () => {
                expect(
                    () =>
                        new EmailVerificationCode({
                            code: '123456',
                            expiresAt: null as any,
                        }),
                ).toThrow('EmailVerificationCode expiresAt is required')
            })
        })
    })

    describe('Expiração', () => {
        it('deve retornar false quando não expirado', () => {
            const code = new EmailVerificationCode({
                code: '123456',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            })

            expect(code.isExpired()).toBe(false)
        })

        it('deve retornar true quando expirado', () => {
            const code = new EmailVerificationCode({
                code: '123456',
                expiresAt: new Date(Date.now() - 1000),
            })

            expect(code.isExpired()).toBe(true)
        })
    })
})