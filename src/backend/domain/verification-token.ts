import { randomBytes } from 'crypto'
import { ValueObject } from './primitives/value-object'

const EXPIRY_HOURS = 1

export interface VerificationTokenInput {
    token: string
    expiresAt: Date
}

export interface VerificationTokenOutput extends VerificationTokenInput {}

export class VerificationToken extends ValueObject<VerificationToken> {
    private readonly token: string
    private readonly expiresAt: Date

    static create(): VerificationToken {
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000)
        return new VerificationToken({
            token: randomBytes(32).toString('hex'),
            expiresAt,
        })
    }

    constructor(data: VerificationTokenInput) {
        super()
        if (!data.token) {
            throw new Error('VerificationToken token is required')
        }
        if (!data.expiresAt) {
            throw new Error('VerificationToken expiresAt is required')
        }

        this.token = data.token
        this.expiresAt = data.expiresAt
    }

    equals(other: VerificationToken): boolean {
        return (
            this.token === other.getToken() &&
            this.expiresAt.getTime() === other.getExpiresAt().getTime()
        )
    }

    isExpired(): boolean {
        return Date.now() > this.expiresAt.getTime()
    }

    getToken(): string {
        return this.token
    }

    getExpiresAt(): Date {
        return this.expiresAt
    }

    serialize(): VerificationTokenOutput {
        return {
            token: this.token,
            expiresAt: this.expiresAt,
        }
    }
}
