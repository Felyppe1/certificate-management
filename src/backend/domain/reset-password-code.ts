import { ValueObject } from './primitives/value-object'

const EXPIRY_MINUTES = 15

export interface ResetPasswordCodeInput {
    code: string
    expiresAt: Date
}

export interface ResetPasswordCodeOutput extends ResetPasswordCodeInput {}

export class ResetPasswordCode extends ValueObject<ResetPasswordCode> {
    private readonly code: string
    private readonly expiresAt: Date

    static create(): ResetPasswordCode {
        const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000)
        return new ResetPasswordCode({
            code: Math.floor(100000 + Math.random() * 900000).toString(),
            expiresAt,
        })
    }

    constructor(data: ResetPasswordCodeInput) {
        super()
        if (!data.code) {
            throw new Error('ResetPasswordCode code is required')
        }
        if (!data.expiresAt) {
            throw new Error('ResetPasswordCode expiresAt is required')
        }

        this.code = data.code
        this.expiresAt = data.expiresAt
    }

    equals(other: ResetPasswordCode): boolean {
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

    serialize(): ResetPasswordCodeOutput {
        return {
            code: this.code,
            expiresAt: this.expiresAt,
        }
    }
}
