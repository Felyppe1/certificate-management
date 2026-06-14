import { describe, expect, it } from 'vitest'
import { ResetPasswordCode } from './reset-password-code'

describe('ResetPasswordCode', () => {
    describe('Construção', () => {
        it('deve criar code válido com create()', () => {
            const code = ResetPasswordCode.create()

            expect(code.getCode()).toMatch(/^\d{6}$/)
            expect(code.getExpiresAt()).toBeInstanceOf(Date)
            expect(code.isExpired()).toBe(false)
        })

        describe('deve lançar erro com dados inválidos', () => {
            it('code ausente', () => {
                expect(
                    () =>
                        new ResetPasswordCode({
                            code: '',
                            expiresAt: new Date(),
                        }),
                ).toThrow('ResetPasswordCode code is required')
            })

            it('expiresAt ausente', () => {
                expect(
                    () =>
                        new ResetPasswordCode({
                            code: '123456',
                            expiresAt: null as any,
                        }),
                ).toThrow('ResetPasswordCode expiresAt is required')
            })
        })
    })

    describe('Expiração', () => {
        it('deve retornar false quando não expirado', () => {
            const code = new ResetPasswordCode({
                code: '123456',
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            })

            expect(code.isExpired()).toBe(false)
        })

        it('deve retornar true quando expirado', () => {
            const code = new ResetPasswordCode({
                code: '123456',
                expiresAt: new Date(Date.now() - 1000),
            })

            expect(code.isExpired()).toBe(true)
        })
    })
})