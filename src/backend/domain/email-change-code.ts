import { ValueObject } from './primitives/value-object'

const EXPIRY_MINUTES = 10

export interface EmailChangeCodeInput {
    newEmail: string
    code: string
    expiresAt: Date
}

export interface EmailChangeCodeOutput extends EmailChangeCodeInput {}

export class EmailChangeCode extends ValueObject<EmailChangeCode> {
    private readonly newEmail: string
    private readonly code: string
    private readonly expiresAt: Date

    static create(newEmail: string): EmailChangeCode {
        const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)
        return new EmailChangeCode({
            newEmail,
            code: Math.floor(100000 + Math.random() * 900000).toString(),
            expiresAt,
        })
    }

    constructor(data: EmailChangeCodeInput) {
        super()
        if (!data.newEmail) {
            throw new Error('EmailChangeCode newEmail is required')
        }
        if (!data.code) {
            throw new Error('EmailChangeCode code is required')
        }
        if (!data.expiresAt) {
            throw new Error('EmailChangeCode expiresAt is required')
        }

        this.newEmail = data.newEmail
        this.code = data.code
        this.expiresAt = data.expiresAt
    }

    equals(other: EmailChangeCode): boolean {
        return (
            this.newEmail === other.getNewEmail() &&
            this.code === other.getCode() &&
            this.expiresAt.getTime() === other.getExpiresAt().getTime()
        )
    }

    isExpired(): boolean {
        return Date.now() > this.expiresAt.getTime()
    }

    getNewEmail(): string {
        return this.newEmail
    }

    getCode(): string {
        return this.code
    }

    getExpiresAt(): Date {
        return this.expiresAt
    }

    serialize(): EmailChangeCodeOutput {
        return {
            newEmail: this.newEmail,
            code: this.code,
            expiresAt: this.expiresAt,
        }
    }
}
