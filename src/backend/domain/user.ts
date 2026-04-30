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
    EmailVerificationCode,
    EmailVerificationCodeOutput,
} from './email-verification-code'
import {
    ResetPasswordCode,
    ResetPasswordCodeOutput,
} from './reset-password-code'
import { ForbiddenError, FORBIDDEN_ERROR_TYPE } from './error/forbidden-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from './error/validation-error'
import { NOT_FOUND_ERROR_TYPE, NotFoundError } from './error/not-found-error'
import { CONFLICT_ERROR_TYPE, ConflictError } from './error/conflict-error'

export const USER_CREDITS = 300

export interface UserInput {
    id: string
    email: string | null
    isEmailVerified: boolean
    name: string
    passwordHash: string | null
    credits: number
    externalAccounts: ExternalAccount[]
    emailVerificationCode: EmailVerificationCode | null
    resetPasswordCode: ResetPasswordCode | null
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
    emailVerificationCode: EmailVerificationCodeOutput | null
    resetPasswordCode: ResetPasswordCodeOutput | null
}

export class User extends AggregateRoot {
    private email: string | null
    private isEmailVerified: boolean
    private name: string
    private passwordHash: string | null
    private credits: number
    private externalAccounts: ExternalAccount[]
    private emailVerificationCode: EmailVerificationCode | null
    private resetPasswordCode: ResetPasswordCode | null

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
            emailVerificationCode:
                data.email && data.passwordHash
                    ? EmailVerificationCode.create()
                    : null,
            externalAccounts: [],
            resetPasswordCode: null,
        })
    }

    constructor(data: UserInput) {
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
        this.emailVerificationCode = data.emailVerificationCode
        this.resetPasswordCode = data.resetPasswordCode
    }

    async setSystemLogin(email: string, plainPassword: string): Promise<void> {
        this.passwordHash = await bcrypt.hash(plainPassword, 10)

        this.changeEmail(email)
    }

    linkSystemAccountWithSameEmail(
        provider: Provider,
        passwordHash: string,
    ): void {
        const externalAccount = this.getExternalAccount(provider)

        if (!externalAccount) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.EXTERNAL_ACCOUNT)
        }

        if (this.hasSystemLogin()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_ENABLED,
            )
        }

        this.passwordHash = passwordHash

        this.changeEmail(externalAccount.getEmail())
    }

    async verifyEmail(tokenStr: string): Promise<void> {
        if (this.isEmailVerified) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.EMAIL_ALREADY_VERIFIED,
            )
        }

        if (!this.emailVerificationCode) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.VERIFICATION_CODE_EXPIRED,
            )
        }

        if (this.emailVerificationCode.getCode() !== tokenStr) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.VERIFICATION_CODE_INVALID,
            )
        }

        if (this.emailVerificationCode.isExpired()) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.VERIFICATION_CODE_EXPIRED,
            )
        }

        this.isEmailVerified = true
        this.emailVerificationCode = null
    }

    generateEmailVerificationCode(): void {
        this.emailVerificationCode = EmailVerificationCode.create()
    }

    getEmailVerificationCode(): string | null {
        return this.emailVerificationCode?.getCode() ?? null
    }

    generateResetPasswordCode(): void {
        if (!this.hasSystemLogin()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
            )
        }

        this.resetPasswordCode = ResetPasswordCode.create()
    }

    getResetPasswordCode(): string | null {
        return this.resetPasswordCode?.getCode() ?? null
    }

    validateResetPasswordCode(code: string): void {
        if (!this.hasSystemLogin()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
            )
        }

        if (!this.resetPasswordCode) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.RESET_PASSWORD_CODE_EXPIRED,
            )
        }

        if (this.resetPasswordCode.isExpired()) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.RESET_PASSWORD_CODE_EXPIRED,
            )
        }

        if (this.resetPasswordCode.getCode() !== code) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.RESET_PASSWORD_CODE_INVALID,
            )
        }
    }

    async resetPassword(code: string, newPassword: string): Promise<void> {
        this.validateResetPasswordCode(code)
        this.passwordHash = await bcrypt.hash(newPassword, 10)
        this.resetPasswordCode = null
    }

    changeEmail(email: string) {
        const isEmailFromExternalAccount = this.externalAccounts.some(
            acc => acc.getEmail() === email,
        )

        const isEmailTheSame = email === this.email

        if (isEmailFromExternalAccount || isEmailTheSame) {
            this.isEmailVerified = true
            this.emailVerificationCode = null
        } else {
            this.isEmailVerified = false
            this.generateEmailVerificationCode()
        }

        this.email = email
    }

    updateName(name: string): void {
        const trimmed = name.trim()
        if (
            trimmed.length < 3 ||
            trimmed.length > 50 ||
            !/^[\p{L} ]+$/u.test(trimmed)
        ) {
            throw new Error(
                'Invalid name: min 3 chars, max 50 chars, letters only',
            )
        }

        this.name = trimmed
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

    addExternalAccountWithSameEmail(
        provider: Provider,
        data: Omit<ExternalAccountInput, 'provider' | 'email'>,
    ): void {
        const externalAccount = this.getExternalAccount(provider)

        if (externalAccount) {
            throw new ConflictError(
                CONFLICT_ERROR_TYPE.EXTERNAL_ACCOUNT_ALREADY_EXISTS,
            )
        }

        if (!this.hasSystemLogin()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
            )
        }

        if (!this.isEmailVerified) {
            this.generateEmailVerificationCode() // TODO: I think this is wrong, what should be done is mark email as verified because if the user hasn't verified it yet and then tries to login with that same email via social login, it means that the email is valid and belongs to the user, so it should be marked as verified
        }

        this.externalAccounts.push(
            new ExternalAccount({
                ...data,
                email: this.getEmail()!,
                provider,
            }),
        )
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

    private getExternalAccount(
        provider: Provider,
    ): ExternalAccount | undefined {
        return this.externalAccounts.find(a => a.getProvider() === provider)
    }

    hasExternalAccount(provider: Provider): boolean {
        return !!this.getExternalAccount(provider)
    }

    hasExternalAccounts(): boolean {
        return this.externalAccounts.length > 0
    }

    getGoogleEmail(): string | null {
        return this.getExternalAccount('GOOGLE')?.getEmail() ?? null
    }

    getGoogleAccessToken(): string | null {
        return this.getExternalAccount('GOOGLE')?.getAccessToken() ?? null
    }

    getGoogleRefreshToken(): string | null {
        return this.getExternalAccount('GOOGLE')?.getRefreshToken() ?? null
    }

    getGoogleAccessTokenExpiryDateTime(): Date | null {
        return (
            this.getExternalAccount('GOOGLE')?.getAccessTokenExpiryDateTime() ??
            null
        )
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
            emailVerificationCode:
                this.emailVerificationCode?.serialize() ?? null,
            resetPasswordCode: this.resetPasswordCode?.serialize() ?? null,
        }
    }
}
