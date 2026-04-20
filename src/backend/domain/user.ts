import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcrypt'
import { AggregateRoot } from './primitives/aggregate-root'
import {
    ExternalAccount,
    ExternalAccountInput,
    ExternalAccountOutput,
    Provider,
} from './external-account'
import {
    VerificationToken,
    VerificationTokenInput,
    VerificationTokenOutput,
} from './verification-token'
import { ForbiddenError, FORBIDDEN_ERROR_TYPE } from './error/forbidden-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from './error/validation-error'
import { NOT_FOUND_ERROR_TYPE, NotFoundError } from './error/not-found-error'

export const USER_CREDITS = 300

export interface UserInput {
    id: string
    email: string | null
    isEmailVerified: boolean
    name: string
    passwordHash: string | null
    credits: number
    externalAccounts: ExternalAccount[]
    verificationToken: VerificationToken | null
}

interface CreateUserInput {
    name: string
    email: string | null
    passwordHash: string | null
}

export interface UserOutput {
    id: string
    email: string | null
    isEmailVerified: boolean
    name: string
    passwordHash: string | null
    credits: number
    externalAccounts: ExternalAccountOutput[]
    verificationToken: VerificationTokenOutput | null
}

export class User extends AggregateRoot {
    private email: string | null
    private isEmailVerified: boolean
    private name: string
    private passwordHash: string | null
    private credits: number
    private externalAccounts: ExternalAccount[]
    private verificationToken: VerificationToken | null

    static async create(data: CreateUserInput): Promise<User> {
        let passwordHash: string | null = null

        if (data.passwordHash) {
            passwordHash = await bcrypt.hash(data.passwordHash, 10)
        }

        return new User({
            id: createId(),
            email: data.email,
            isEmailVerified: false,
            name: data.name,
            passwordHash,
            credits: USER_CREDITS,
            verificationToken:
                data.email && data.passwordHash
                    ? VerificationToken.create()
                    : null,
            externalAccounts: [],
        })
    }

    constructor(data: UserInput) {
        console.log(data)
        super(data.id)

        if (!data.id) {
            throw new Error('User id is required')
        }
        if (!data.name) {
            throw new Error('User name is required')
        }
        if (data.credits === undefined || data.credits === null) {
            throw new Error('User credits is required')
        }
        if (!data.externalAccounts) {
            throw new Error('User external accounts list is required')
        }

        if (data.email && !data.passwordHash) {
            throw new Error(
                'User password hash is required when email is provided',
            )
        }
        if (!data.email && data.passwordHash) {
            throw new Error(
                'User email is required when password hash is provided',
            )
        }

        this.email = data.email
        this.isEmailVerified = data.isEmailVerified
        this.name = data.name
        this.passwordHash = data.passwordHash
        this.credits = data.credits
        this.externalAccounts = data.externalAccounts
        this.verificationToken = data.verificationToken
    }

    async setSystemLogin(email: string, plainPassword: string): Promise<void> {
        this.passwordHash = await bcrypt.hash(plainPassword, 10)

        this.changeEmail(email)
    }

    async verifyEmail(tokenStr: string): Promise<void> {
        if (this.isEmailVerified) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.EMAIL_ALREADY_VERIFIED,
            )
        }

        if (!this.verificationToken) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.TOKEN_EXPIRED)
        }

        if (this.verificationToken.getToken() !== tokenStr) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.TOKEN_INVALID)
        }

        if (this.verificationToken.isExpired()) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.TOKEN_EXPIRED)
        }

        this.isEmailVerified = true
        this.verificationToken = null
    }

    generateVerificationToken(): void {
        this.verificationToken = VerificationToken.create()
    }

    getVerificationToken(): string | null {
        return this.verificationToken?.getToken() ?? null
    }

    changeEmail(email: string) {
        this.email = email

        const isEmailFromExternalAccount = this.externalAccounts.some(
            acc => acc.getEmail() === email,
        )

        if (isEmailFromExternalAccount) {
            this.isEmailVerified = true
            this.verificationToken = null
        } else {
            this.isEmailVerified = false
            this.generateVerificationToken()
        }
    }

    async updatePassword(
        newPassword: string,
        currentPassword: string,
    ): Promise<void> {
        const hasSystemLogin = this.hasSystemLogin()

        if (!hasSystemLogin) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
            )
        }

        const isCurrentPasswordValid =
            await this.comparePassword(currentPassword)

        if (!isCurrentPasswordValid) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.CURRENT_PASSWORD_INCORRECT,
            )
        }

        this.passwordHash = await bcrypt.hash(newPassword, 10)
    }

    async comparePassword(plainPassword: string): Promise<boolean> {
        if (!this.passwordHash) return false
        return await bcrypt.compare(plainPassword, this.passwordHash)
    }

    addExternalAccount(data: ExternalAccountInput): void {
        this.externalAccounts.push(new ExternalAccount(data))
    }

    updateExternalAccount(
        provider: Provider,
        tokens: {
            accessToken: string
            accessTokenExpiryDateTime: Date | null
            refreshToken?: string | null
        },
    ): void {
        const account = this.externalAccounts.find(
            a => a.getProvider() === provider,
        )

        if (!account) return

        account.updateTokens(
            tokens.accessToken,
            tokens.accessTokenExpiryDateTime,
            tokens.refreshToken,
        )
    }

    removeExternalAccount(provider: Provider): ExternalAccountOutput {
        const externalAccount = this.getExternalAccount(provider)

        if (!externalAccount) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.EXTERNAL_ACCOUNT)
        }

        const canRemove = this.canRemoveExternalAccount(provider)

        if (!canRemove) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.LAST_LOGIN_METHOD)
        }

        this.externalAccounts = this.externalAccounts.filter(
            a => a.getProvider() !== provider,
        )

        return externalAccount.serialize()
    }

    hasVerifiedEmailAccess(): boolean {
        return this.isEmailVerified
    }

    hasSystemLogin(): boolean {
        return !!this.email && !!this.passwordHash
    }

    canRemoveExternalAccount(provider: Provider): boolean {
        const remainingExternalAccounts = this.externalAccounts.filter(
            a => a.getProvider() !== provider,
        )
        return (
            remainingExternalAccounts.length > 0 ||
            this.hasVerifiedEmailAccess()
        )
    }

    getExternalAccount(provider: Provider): ExternalAccount | undefined {
        return this.externalAccounts.find(a => a.getProvider() === provider)
    }

    getExternalAccounts(): ExternalAccount[] {
        return [...this.externalAccounts]
    }

    getEmail(): string | null {
        return this.email
    }

    getIsEmailVerified(): boolean {
        return this.isEmailVerified
    }

    getName(): string {
        return this.name
    }

    getPasswordHash(): string | null {
        return this.passwordHash
    }

    getCredits(): number {
        return this.credits
    }

    serialize(): UserOutput {
        return {
            id: this.getId(),
            email: this.email,
            isEmailVerified: this.isEmailVerified,
            name: this.name,
            passwordHash: this.passwordHash,
            credits: this.credits,
            externalAccounts: this.externalAccounts.map(account =>
                account.serialize(),
            ),
            verificationToken: this.verificationToken?.serialize() ?? null,
        }
    }
}
