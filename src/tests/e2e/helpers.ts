import { BrowserContext } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { TIPS_STORAGE_KEY } from '@/app/(system)/certificados/[id]/_components/CertificatePageClient/components/TipsButton'
import { createId } from '@paralleldrive/cuid2'
import crypto from 'crypto'
import { faker } from '@faker-js/faker'


export async function setupAuth(prisma: PrismaClient, context: BrowserContext) {
    const userId = createId()
    const token = crypto.randomBytes(32).toString('hex')

    await prisma.user.create({
        data: {
            id: userId,
            email: faker.internet.email(),
            name: faker.person.fullName(),
            password_hash: 'hash',
        },
    })
    await prisma.session.create({
        data: {
            token,
            user_id: userId,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    })

    await context.addInitScript(
        key => localStorage.setItem(key, 'true'),
        TIPS_STORAGE_KEY,
    )

    await context.addCookies([
        {
            name: SESSION_COOKIE_NAME,
            value: token,
            domain: 'localhost',
            path: '/',
        },
    ])

    return { userId }
}

export async function setupCertificate(
    prisma: PrismaClient,
    context: BrowserContext,
) {
    const { userId } = await setupAuth(prisma, context)
    const emissionId = createId()

    await prisma.certificateEmission.create({
        data: {
            id: emissionId,
            title: faker.commerce.productName(),
            status: 'DRAFT',
            user_id: userId,
        },
    })

    return { userId, emissionId }
}
