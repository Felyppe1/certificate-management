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
import { EmailChangeCode, EmailChangeCodeOutput } from './email-change-code'
import { SystemLoginEnabledError } from './error/validation-error/system-login-enabled-error'
import { EmailAlreadyVerifiedError } from './error/validation-error/email-already-verified-error'
import { SystemLoginNotEnabledError } from './error/validation-error/system-login-not-enabled-error'
import { CurrentPasswordIncorrectError } from './error/validation-error/current-password-incorrect-error'
import { LastLoginMethodError } from './error/validation-error/last-login-method-error'
import { ExternalAccountNotFoundError } from './error/not-found-error/external-account-not-found-error'
import { ExternalAccountAlreadyExistsError } from './error/conflict-error/external-account-already-exists-error'
import { VerificationCodeExpiredError } from './error/forbidden-error/verification-code-expired-error'
import { VerificationCodeInvalidError } from './error/forbidden-error/verification-code-invalid-error'
import { ResetPasswordCodeExpiredError } from './error/forbidden-error/reset-password-code-expired-error'
import { ResetPasswordCodeInvalidError } from './error/forbidden-error/reset-password-code-invalid-error'
import { EmailChangeCodeExpiredError } from './error/forbidden-error/email-change-code-expired-error'
import { EmailChangeCodeInvalidError } from './error/forbidden-error/email-change-code-invalid-error'

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
    emailChangeCode: EmailChangeCode | null
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
    emailChangeCode: EmailChangeCodeOutput | null
}

export class User extends AggregateRoot {
    private email: string | null
    private isEmailVerified: boolean
    private name: string
    private passwordHash: string | null
    private readonly credits: number
    private externalAccounts: ExternalAccount[]
    private emailVerificationCode: EmailVerificationCode | null
    private resetPasswordCode: ResetPasswordCode | null
    private emailChangeCode: EmailChangeCode | null

    static async create(data: CreateUserInput): Promise<User> {
        let passwordHash: string | null = null

        if (data.passwordHash) {
            User.validatePassword(data.passwordHash)
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
            emailChangeCode: null,
        })
    }

    private static validatePassword(password: string): void {
        if (!password) {
            throw new Error('Password is required')
        }
        if (password.length < 6 || password.length > 100) {
            throw new Error('Invalid password: min 6 chars, max 100 chars')
        }
    }

    private static validateName(name: string): void {
        const trimmed = name?.trim() ?? ''
        if (!trimmed) {
            throw new Error('User name is required')
        }
        if (trimmed.length < 3 || trimmed.length > 100) {
            throw new Error('Invalid name: min 3 chars, max 100 chars')
        }
    }

    constructor(data: UserInput) {
        super(data.id)

        User.validateName(data.name)
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
        this.emailChangeCode = data.emailChangeCode
    }

    async setSystemLogin(email: string, plainPassword: string): Promise<void> {
        User.validatePassword(plainPassword)
        this.passwordHash = await bcrypt.hash(plainPassword, 10)

        const isEmailFromExternalAccount = this.externalAccounts.some(
            acc => acc.getEmail() === email,
        )

        if (isEmailFromExternalAccount) {
            this.isEmailVerified = true
        } else {
            this.generateEmailVerificationCode()
        }

        this.email = email
    }

    linkSystemAccountWithSameEmail(
        provider: Provider,
        passwordHash: string,
    ): void {
        const externalAccount = this.getExternalAccount(provider)

        if (!externalAccount) {
            throw new ExternalAccountNotFoundError()
        }

        if (this.hasSystemLogin()) {
            throw new SystemLoginEnabledError()
        }

        this.passwordHash = passwordHash

        this.isEmailVerified = true
        this.email = externalAccount.getEmail()
    }

    async verifyEmail(tokenStr: string): Promise<void> {
        if (this.isEmailVerified) {
            throw new EmailAlreadyVerifiedError()
        }

        if (!this.emailVerificationCode) {
            throw new VerificationCodeExpiredError()
        }

        if (this.emailVerificationCode.getCode() !== tokenStr) {
            throw new VerificationCodeInvalidError()
        }

        if (this.emailVerificationCode.isExpired()) {
            throw new VerificationCodeExpiredError()
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
            throw new SystemLoginNotEnabledError()
        }

        this.resetPasswordCode = ResetPasswordCode.create()
    }

    getResetPasswordCode(): string | null {
        return this.resetPasswordCode?.getCode() ?? null
    }

    validateResetPasswordCode(code: string): void {
        if (!this.hasSystemLogin()) {
            throw new SystemLoginNotEnabledError()
        }

        if (!this.resetPasswordCode) {
            throw new ResetPasswordCodeExpiredError()
        }

        if (this.resetPasswordCode.isExpired()) {
            throw new ResetPasswordCodeExpiredError()
        }

        if (this.resetPasswordCode.getCode() !== code) {
            throw new ResetPasswordCodeInvalidError()
        }
    }

    async resetPassword(code: string, newPassword: string): Promise<void> {
        this.validateResetPasswordCode(code)
        User.validatePassword(newPassword)
        this.passwordHash = await bcrypt.hash(newPassword, 10)
        this.resetPasswordCode = null
    }

    confirmEmailChange(code: string): void {
        if (!this.emailChangeCode) {
            throw new EmailChangeCodeExpiredError() // this error message is not accurate because the code might not be expired but just not exist, should we have a different error message for that case?
        }

        if (this.emailChangeCode.isExpired()) {
            throw new EmailChangeCodeExpiredError()
        }

        if (this.emailChangeCode.getCode() !== code) {
            throw new EmailChangeCodeInvalidError()
        }

        this.email = this.emailChangeCode.getNewEmail()
        this.emailChangeCode = null
    }

    cancelEmailChange(): void {
        this.emailChangeCode = null
    }

    getEmailChangeCode(): string | null {
        return this.emailChangeCode?.getCode() ?? null
    }

    getEmailRequestedForChange(): string | null {
        return this.emailChangeCode?.getNewEmail() ?? null
    }

    changeEmail(email: string) {
        if (!this.hasSystemLogin()) {
            throw new SystemLoginNotEnabledError()
        }

        const isEmailTheSame = email === this.email

        if (isEmailTheSame) {
            throw new EmailAlreadyVerifiedError()
        }

        const isEmailFromExternalAccount = this.externalAccounts.some(
            acc => acc.getEmail() === email,
        )

        if (!isEmailFromExternalAccount) {
            this.emailChangeCode = EmailChangeCode.create(email)
            return
        }

        this.email = email
    }

    updateName(name: string): void {
        User.validateName(name)
        this.name = name.trim()
    }

    async updatePassword(
        newPassword: string,
        currentPassword: string,
    ): Promise<void> {
        const hasSystemLogin = this.hasSystemLogin()

        if (!hasSystemLogin) {
            throw new SystemLoginNotEnabledError()
        }

        const isCurrentPasswordValid =
            await this.comparePassword(currentPassword)

        if (!isCurrentPasswordValid) {
            throw new CurrentPasswordIncorrectError()
        }

        User.validatePassword(newPassword)
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
            throw new ExternalAccountAlreadyExistsError()
        }

        if (!this.hasSystemLogin()) {
            throw new SystemLoginNotEnabledError()
        }

        if (!this.isEmailVerified) {
            this.generateEmailVerificationCode() // I think this is wrong, what should be done is mark email as verified because if the user hasn't verified it yet and then tries to login with that same email via social login, it means that the email is valid and belongs to the user, so it should be marked as verified
        }

        this.externalAccounts.push(
            new ExternalAccount({
                ...data,
                email: this.getEmail()!,
                provider,
            }),
        )
    }

    updateExternalAccountTokens(
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
            throw new ExternalAccountNotFoundError()
        }

        const canRemove = this.canRemoveExternalAccount(provider)

        if (!canRemove) {
            throw new LastLoginMethodError()
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

    cancelSystemLogin(): void {
        this.email = null
        this.passwordHash = null
        this.emailVerificationCode = null
        this.isEmailVerified = false
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
            emailChangeCode: this.emailChangeCode?.serialize() ?? null,
        }
    }
}