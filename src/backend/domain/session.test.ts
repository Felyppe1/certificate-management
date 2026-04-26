import { describe, expect, it, vi } from 'vitest'
import { Session, SESSION_EXPIRY_DAYS } from './session'

describe('Session', () => {
    describe('session creation', () => {
        it('should create a session with token, userId and expiration date', () => {
            const session = Session.create('user-1')

            expect(session.getToken()).toBeDefined()
            expect(session.getUserId()).toBe('user-1')
            expect(session.getExpiresAt()).toBeInstanceOf(Date)
        })

        it('should set expiration date based on SESSION_EXPIRY_DAYS', () => {
            const now = new Date()
            const session = Session.create('user-1')

            const expected = new Date()
            expected.setDate(now.getDate() + SESSION_EXPIRY_DAYS)

            expect(session.getExpiresAt().getDate()).toBe(expected.getDate())
        })
    })

    describe('session getters', () => {
        it('should return correct values from getters', () => {
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
})
