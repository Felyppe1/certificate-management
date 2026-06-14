import { describe, expect, it } from 'vitest'
import { EmailChangeCode } from './email-change-code'

describe('EmailChangeCode', () => {
    describe('Construção', () => {
        it('deve criar code válido com create()', () => {
            const code = EmailChangeCode.create('novo@example.com')

            expect(code.getNewEmail()).toBe('novo@example.com')
            expect(code.getCode()).toMatch(/^\d{6}$/)
            expect(code.getExpiresAt()).toBeInstanceOf(Date)
            expect(code.isExpired()).toBe(false)
        })

        describe('deve lançar erro com dados inválidos', () => {
            it('newEmail ausente', () => {
                expect(
                    () =>
                        new EmailChangeCode({
                            newEmail: '',
                            code: '123456',
                            expiresAt: new Date(),
                        }),
                ).toThrow('EmailChangeCode newEmail is required')
            })

            it('code ausente', () => {
                expect(
                    () =>
                        new EmailChangeCode({
                            newEmail: 'novo@example.com',
                            code: '',
                            expiresAt: new Date(),
                        }),
                ).toThrow('EmailChangeCode code is required')
            })

            it('expiresAt ausente', () => {
                expect(
                    () =>
                        new EmailChangeCode({
                            newEmail: 'novo@example.com',
                            code: '123456',
                            expiresAt: null as any,
                        }),
                ).toThrow('EmailChangeCode expiresAt is required')
            })
        })
    })

    describe('Expiração', () => {
        it('deve retornar false quando não expirado', () => {
            const code = new EmailChangeCode({
                newEmail: 'novo@example.com',
                code: '123456',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            })

            expect(code.isExpired()).toBe(false)
        })

        it('deve retornar true quando expirado', () => {
            const code = new EmailChangeCode({
                newEmail: 'novo@example.com',
                code: '123456',
                expiresAt: new Date(Date.now() - 1000),
            })

            expect(code.isExpired()).toBe(true)
        })
    })
})