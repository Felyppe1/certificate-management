import crypto from 'crypto'
import { AggregateRoot } from './primitives/aggregate-root'

export const SESSION_EXPIRY_DAYS = 7

export interface SessionInput {
    token: string
    userId: string
    expiresAt: Date
}

export interface SessionOutput extends SessionInput {}

export class Session extends AggregateRoot {
    private userId: string
    private expiresAt: Date

    static create(userId: string): Session {
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS)

        return new Session({ token, userId, expiresAt })
    }

    constructor(data: SessionInput) {
        super(data.token)
        this.userId = data.userId
        this.expiresAt = data.expiresAt
    }

    getToken(): string {
        return this.getId()
    }

    getUserId(): string {
        return this.userId
    }

    getExpiresAt(): Date {
        return this.expiresAt
    }

    isExpired(): boolean {
        return new Date() >= this.expiresAt
    }

    toPrimitives(): SessionOutput {
        return {
            token: this.getId(),
            userId: this.userId,
            expiresAt: this.expiresAt,
        }
    }
}
