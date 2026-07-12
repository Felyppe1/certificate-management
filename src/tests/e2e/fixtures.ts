import { test as base, BrowserContext } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { TIPS_STORAGE_KEY } from '@/app/(system)/certificados/[id]/CertificatePageClient/TipsButton'
import { DB_URL } from './config'
import {
    createSession,
    createUser,
    setSessionCookie,
    TestUser,
} from './helpers/auth-helpers'
import { Navbar } from './pages/navbar'
import { LoginPage } from './pages/login-page'
import { SignUpPage } from './pages/sign-up-page'
import { VerifyEmailPage } from './pages/verify-email-page'
import { ResetPasswordPage } from './pages/reset-password-page'
import { AccountSettingsPage } from './pages/account-settings-page'
import { DashboardPage } from './pages/dashboard-page'
import { CertificatePage } from './pages/certificate-page'

// "Auth provider" client: creates new users per test and cleans up at the end.
// Here the provider is the database itself (local password auth), so creating a
// user is just an INSERT. Use only when the test depends on the user's own
// identity (signup, password reset, email/password change).
export class AuthProviderClient {
    private readonly createdUserIds: string[] = []

    constructor(
        private readonly prisma: PrismaClient,
        private readonly context: BrowserContext,
    ) {}

    async createUser(
        options: { password?: string; verified?: boolean } = {},
    ): Promise<TestUser> {
        const user = await createUser(this.prisma, options)
        this.createdUserIds.push(user.userId)
        return user
    }

    async createSession(userId: string): Promise<string> {
        return createSession(this.prisma, userId)
    }

    // Creates a session and injects the cookie, leaving the test already authenticated.
    async authenticate(userId: string): Promise<string> {
        const token = await createSession(this.prisma, userId)
        await setSessionCookie(this.context, token)
        return token
    }

    async cleanup(): Promise<void> {
        if (this.createdUserIds.length === 0) return
        await this.prisma.user.deleteMany({
            where: { id: { in: this.createdUserIds } },
        })
    }
}

type WorkerFixtures = {
    workerUser: TestUser & { sessionToken: string }
}

type TestFixtures = {
    prisma: PrismaClient
    loggedInUser: TestUser
    authProviderClient: AuthProviderClient
    navbar: Navbar
    loginPage: LoginPage
    signUpPage: SignUpPage
    verifyEmailPage: VerifyEmailPage
    resetPasswordPage: ResetPasswordPage
    accountSettingsPage: AccountSettingsPage
    dashboardPage: DashboardPage
    certificatePage: CertificatePage
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
    // Prisma client for tests to query/prepare the database directly.
    prisma: [
        async ({}, use) => {
            process.env.DB_URL = DB_URL
            process.env.DB_DIRECT_URL = DB_URL

            const pool = new Pool({ connectionString: DB_URL })
            const adapter = new PrismaPg(pool)
            const prisma = new PrismaClient({ adapter })

            await use(prisma)

            await prisma.$disconnect()
            await pool.end()
        },
        { auto: true },
    ],

    // Dismisses the tips in every test, without repeating the init script.
    context: async ({ context }, use) => {
        await context.addInitScript(
            key => localStorage.setItem(key, 'true'),
            TIPS_STORAGE_KEY,
        )
        await use(context)
    },

    // User shared per worker: created once and reused by every test that runs on
    // that worker (cheaper than creating one per test).
    workerUser: [
        async ({}, use) => {
            const pool = new Pool({ connectionString: DB_URL })
            const adapter = new PrismaPg(pool)
            const prisma = new PrismaClient({ adapter })

            const user = await createUser(prisma)
            const sessionToken = await createSession(prisma, user.userId)

            await use({ ...user, sessionToken })

            await prisma.user
                .delete({ where: { id: user.userId } })
                .catch(() => {})
            await prisma.$disconnect()
            await pool.end()
        },
        { scope: 'worker' },
    ],

    // Inject this for the test to start authenticated with the worker's user. Use
    // when the test only needs to be logged in to exercise another flow (certificates, etc.).
    loggedInUser: async ({ workerUser, context }, use) => {
        await setSessionCookie(context, workerUser.sessionToken)
        await use({
            userId: workerUser.userId,
            email: workerUser.email,
            name: workerUser.name,
        })
    },

    authProviderClient: async ({ prisma, context }, use) => {
        const client = new AuthProviderClient(prisma, context)
        await use(client)
        await client.cleanup()
    },

    navbar: async ({ page }, use) => {
        await use(new Navbar(page))
    },
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page))
    },
    signUpPage: async ({ page }, use) => {
        await use(new SignUpPage(page))
    },
    verifyEmailPage: async ({ page }, use) => {
        await use(new VerifyEmailPage(page))
    },
    resetPasswordPage: async ({ page }, use) => {
        await use(new ResetPasswordPage(page))
    },
    accountSettingsPage: async ({ page }, use) => {
        await use(new AccountSettingsPage(page))
    },
    dashboardPage: async ({ page }, use) => {
        await use(new DashboardPage(page))
    },
    certificatePage: async ({ page }, use) => {
        await use(new CertificatePage(page))
    },
})

export { expect } from '@playwright/test'
