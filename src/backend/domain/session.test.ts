import { describe, expect, it, vi } from 'vitest'
import { Session, SESSION_EXPIRY_DAYS } from './session'

describe('Session', () => {
    describe('criação de sessão', () => {
        it('deve criar uma sessão com token, userId e data de expiração', () => {
            const session = Session.create('user-1')

            expect(session.getToken()).toBeDefined()
            expect(session.getUserId()).toBe('user-1')
            expect(session.getExpiresAt()).toBeInstanceOf(Date)
        })

        it('deve definir a data de expiração com base em SESSION_EXPIRY_DAYS', () => {
            const now = new Date()
            const session = Session.create('user-1')

            const expected = new Date()
            expected.setDate(now.getDate() + SESSION_EXPIRY_DAYS)

            expect(session.getExpiresAt().getDate()).toBe(expected.getDate())
        })
    })

    describe('getters da sessão', () => {
        it('deve retornar os valores corretos pelos getters', () => {
            const expiresAt = new Date()
            const session = new Session({
                token: 'token-123',
                userId: 'user-123',
                expiresAt,
            })

            expect(session.getToken()).toBe('token-123')
            expect(session.getUserId()).toBe('user-123')
            expect(session.getExpiresAt()).toBe(expiresAt)
        })
    })

    describe('lógica de expiração', () => {
        describe('deve considerar a sessão expirada quando é', () => {
            it('1ms no passado (abaixo do limite)', () => {
                vi.useFakeTimers()
                const now = new Date()
                vi.setSystemTime(now)

                const session = new Session({
                    token: 'token',
                    userId: 'user',
                    expiresAt: new Date(now.getTime() - 1),
                })
                expect(session.isExpired()).toBe(true)

                vi.useRealTimers()
            })

            it('exatamente agora (limite)', () => {
                vi.useFakeTimers()
                const now = new Date()
                vi.setSystemTime(now)

                const session = new Session({
                    token: 'token',
                    userId: 'user',
                    expiresAt: now,
                })
                expect(session.isExpired()).toBe(true)

                vi.useRealTimers()
            })
        })

        describe('deve considerar a sessão válida quando é', () => {
            it('1ms no futuro (acima do limite)', () => {
                vi.useFakeTimers()
                const now = new Date()
                vi.setSystemTime(now)

                const session = new Session({
                    token: 'token',
                    userId: 'user',
                    expiresAt: new Date(now.getTime() + 1),
                })
                expect(session.isExpired()).toBe(false)

                vi.useRealTimers()
            })
        })
    })

    describe('serialização', () => {
        it('deve converter a sessão para primitivos corretamente', () => {
            const expiresAt = new Date()

            const session = new Session({
                token: 'token-123',
                userId: 'user-123',
                expiresAt,
            })

            expect(session.toPrimitives()).toEqual({
                token: 'token-123',
                userId: 'user-123',
                expiresAt,
            })
        })
    })
})
