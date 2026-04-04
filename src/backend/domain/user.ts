import { createId } from '@paralleldrive/cuid2'
import { AggregateRoot } from './primitives/aggregate-root'

export const USER_CREDITS = 300

export interface UserInput {
    id: string
    email: string
    name: string
    passwordHash: string | null
    credits: number
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
}

export class User extends AggregateRoot {
    private email: string
    private name: string
    private passwordHash: string | null
    private credits: number

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
        }
    }
}
