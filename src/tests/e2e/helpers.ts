import { BrowserContext, Page, expect } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { TIPS_STORAGE_KEY } from '@/app/(system)/certificados/[id]/_components/CertificatePageClient/components/TipsButton'
import { createId } from '@paralleldrive/cuid2'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { faker } from '@faker-js/faker'
import path from 'path'

const TEMPLATE_FIXTURE = path.resolve('src/tests/e2e/fixtures/template.docx')
const DATA_SOURCE_FIXTURE = path.resolve(
    'src/tests/e2e/fixtures/data-source.csv',
)

export async function setupAuth(
    prisma: PrismaClient,
    context: BrowserContext,
    password?: string,
) {
    const userId = createId()
    const email = faker.internet.email()
    const name = faker.person.fullName()
    const token = crypto.randomBytes(32).toString('hex')
    const passwordHash = password ? await bcrypt.hash(password, 10) : 'hash'

    await prisma.user.create({
        data: {
            id: userId,
            email,
            name,
            password_hash: passwordHash,
            ...(password ? { is_email_verified: true } : {}),
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

    return { userId, email, name }
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

export async function uploadTemplate(page: Page) {
    await page.getByTestId('template-upload-option').click()
    await page.getByTestId('file-input').setInputFiles(TEMPLATE_FIXTURE)
    await expect(page.getByText('Template adicionado com sucesso')).toBeVisible(
        { timeout: 30000 },
    )
}

export async function uploadDataSource(page: Page) {
    await page.getByTestId('data-source-upload-option').click()
    await page.getByTestId('file-input').setInputFiles(DATA_SOURCE_FIXTURE)
    await expect(
        page.getByText('Fonte de dados adicionada com sucesso'),
    ).toBeVisible({ timeout: 30000 })
}
