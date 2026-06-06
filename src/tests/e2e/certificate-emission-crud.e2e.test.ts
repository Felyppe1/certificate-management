import { test, expect } from './fixtures'
import { BrowserContext } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { TIPS_STORAGE_KEY } from '@/app/(system)/certificados/[id]/_components/CertificatePageClient/components/TipsButton'
import { createId } from '@paralleldrive/cuid2'
import crypto from 'crypto'
import { faker } from '@faker-js/faker'

async function setupAuth(prisma: PrismaClient, context: BrowserContext) {
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

test.describe('Certificate emission CRUD', () => {
    test('should create, rename, verify updated name in listing, delete, and verify deletion', async ({
        page,
        context,
        prisma,
    }) => {
        const { userId } = await setupAuth(prisma, context)

        const initialName = faker.commerce.productName()
        const renamedName = `${initialName} Renammed`

        // --- Create ---
        await page.goto('/')
        await page.getByRole('button', { name: 'Criar' }).first().click()
        await page.getByLabel('Nome da emissão').fill(initialName)
        await page.getByRole('button', { name: 'Criar Emissão' }).click()
        await page.waitForURL(/\/certificados\/.+/)

        // --- Rename ---
        await page.getByTitle('Editar nome do certificado').click()
        await page.getByRole('textbox').fill(renamedName)
        await page.getByRole('textbox').press('Enter')
        await expect(page.getByText('Nome atualizado com sucesso')).toBeVisible(
            { timeout: 20000 },
        )

        // --- Verify updated name in listing ---
        await page.goto('/')
        const emissionLink = page.getByRole('link', { name: renamedName })
        await expect(emissionLink).toBeVisible()

        // --- Navigate back to detail page and delete ---
        await emissionLink.click()
        await page.waitForURL(/\/certificados\/.+/)
        await page.getByTitle('Excluir certificado').click()
        const continueButton = page.getByRole('button', { name: 'Continuar' })
        await expect(continueButton).toBeVisible()
        await continueButton.click()
        await expect(
            page.getByText('Certificado excluído com sucesso'),
        ).toBeVisible({ timeout: 20000 })

        // --- Verify gone from listing ---
        await page.waitForURL('http://localhost:3001/')
        await expect(emissionLink).not.toBeVisible()
        await expect(
            page.getByText('Nenhuma emissão de certificado criada'),
        ).toBeVisible()

        await prisma.user.delete({ where: { id: userId } })
    })
})
