import { ValueObject } from './primitives/value-object'

const EXPIRY_MINUTES = 15

export interface EmailVerificationCodeInput {
    code: string
    expiresAt: Date
}

export interface EmailVerificationCodeOutput
    extends EmailVerificationCodeInput {}

export class EmailVerificationCode extends ValueObject<EmailVerificationCode> {
    private readonly code: string
    private readonly expiresAt: Date

    static create(): EmailVerificationCode {
        const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)
        return new EmailVerificationCode({
            code: Math.floor(100000 + Math.random() * 900000).toString(),
            expiresAt,
        })
    }

    constructor(data: EmailVerificationCodeInput) {
        super()
        if (!data.code) {
            throw new Error('EmailVerificationCode code is required')
        }
        if (!data.expiresAt) {
            throw new Error('EmailVerificationCode expiresAt is required')
        }

        this.code = data.code
        this.expiresAt = data.expiresAt
    }

    equals(other: EmailVerificationCode): boolean {
        return (
            this.code === other.getCode() &&
            this.expiresAt.getTime() === other.getExpiresAt().getTime()
        )
    }

    isExpired(): boolean {
        return Date.now() > this.expiresAt.getTime()
    }

    getCode(): string {
        return this.code
    }

    getExpiresAt(): Date {
        return this.expiresAt
    }

    serialize(): EmailVerificationCodeOutput {
        return {
            code: this.code,
            expiresAt: this.expiresAt,
        }
    }
}
