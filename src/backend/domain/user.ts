import { createId } from '@paralleldrive/cuid2'
import { AggregateRoot } from './primitives/aggregate-root'
import {
    ExternalAccount,
    ExternalAccountInput,
    ExternalAccountOutput,
    Provider,
} from './external-account'

export const USER_CREDITS = 300

export interface UserInput {
    id: string
    email: string
    name: string
    passwordHash: string | null
    credits: number
    externalAccounts?: ExternalAccountInput[]
}

interface CreateUserInput {
    name: string
    email: string
    passwordHash: string | null
}

export interface UserOutput {
    id: string
    email: string
    name: string
    passwordHash: string | null
    credits: number
    externalAccounts: ExternalAccountOutput[]
}

export class User extends AggregateRoot {
    private email: string
    private name: string
    private passwordHash: string | null
    private credits: number
    private externalAccounts: ExternalAccount[]

    static create(data: CreateUserInput): User {
        return new User({
            id: createId(),
            email: data.email,
            name: data.name,
            passwordHash: data.passwordHash,
            credits: USER_CREDITS,
        })
    }

    constructor(data: UserInput) {
        super(data.id)
        this.email = data.email
        this.name = data.name
        this.passwordHash = data.passwordHash
        this.credits = data.credits
        this.externalAccounts = (data.externalAccounts ?? []).map(
            a => new ExternalAccount(a),
        )
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

    getExternalAccount(provider: Provider): ExternalAccount | undefined {
        return this.externalAccounts.find(a => a.getProvider() === provider)
    }

    getExternalAccounts(): ExternalAccount[] {
        return [...this.externalAccounts]
    }

    getEmail(): string {
        return this.email
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
            name: this.name,
            passwordHash: this.passwordHash,
            credits: this.credits,
            externalAccounts: this.externalAccounts.map(account =>
                account.serialize(),
            ),
        }
    }
}
