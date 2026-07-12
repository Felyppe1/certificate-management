import { BrowserContext } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { createId } from '@paralleldrive/cuid2'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { faker } from '@faker-js/faker'

export type TestUser = {
    userId: string
    email: string
    name: string
}

// Creates a user in the database. When `password` is given, the user is already
// created with a verified email and hashed password (so it can log in via the form).
export async function createUser(
    prisma: PrismaClient,
    options: { password?: string; verified?: boolean } = {},
): Promise<TestUser> {
    const userId = createId()
    const email = faker.internet.email()
    const name = faker.person.fullName()
    const passwordHash = options.password
        ? await bcrypt.hash(options.password, 10)
        : 'hash'
    const isEmailVerified = options.verified ?? Boolean(options.password)

    await prisma.user.create({
        data: {
            id: userId,
            email,
            name,
            password_hash: passwordHash,
            is_email_verified: isEmailVerified,
        },
    })

    return { userId, email, name }
}

// Creates a valid session for the user and returns the token.
export async function createSession(
    prisma: PrismaClient,
    userId: string,
): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')

    await prisma.session.create({
        data: {
            token,
            user_id: userId,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    })

    return token
}

// Injects the session cookie into the browser context to authenticate the test.
export async function setSessionCookie(
    context: BrowserContext,
    token: string,
): Promise<void> {
    await context.addCookies([
        {
            name: SESSION_COOKIE_NAME,
            value: token,
            domain: 'localhost',
            path: '/',
        },
    ])
}

// Creates a DRAFT certificate emission belonging to the given user.
export async function createEmission(
    prisma: PrismaClient,
    userId: string,
): Promise<{ emissionId: string }> {
    const emissionId = createId()

    await prisma.certificateEmission.create({
        data: {
            id: emissionId,
            title: faker.commerce.productName(),
            status: 'DRAFT',
            user_id: userId,
        },
    })

    return { emissionId }
}
