import { test, expect } from './fixtures'
import { BrowserContext } from '@playwright/test'
import { PrismaClient } from '@/backend/infrastructure/repository/prisma/client/client'
import crypto from 'crypto'

async function setupAuth(prisma: PrismaClient, context: BrowserContext) {
    const token = crypto.randomBytes(32).toString('hex')

    await prisma.user.create({
        data: {
            id: 'user-e2e-crud',
            email: 'crud@test.com',
            name: 'CRUD User',
            password_hash: 'hash',
        },
    })
    await prisma.session.create({
        data: {
            token,
            user_id: 'user-e2e-crud',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    })
    await context.addCookies([
        {
            name: 'session_token',
            value: token,
            domain: 'localhost',
            path: '/',
        },
    ])
}

test.describe('Certificate emission CRUD', () => {
    test('should create, rename, verify updated name in listing, delete, and verify deletion', async ({
        page,
        context,
        prisma,
    }) => {
        await setupAuth(prisma, context)

        // --- Create ---
        await page.goto('/')
        await page.getByRole('button', { name: 'Criar' }).first().click()
        await page.getByLabel('Nome da emissão').fill('E2E Certificate')
        await page.getByRole('button', { name: 'Criar Emissão' }).click()
        await page.waitForURL(/\/certificados\/.+/)

        // --- Rename ---
        await page.getByTitle('Editar nome do certificado').click()
        await page.getByRole('textbox').fill('E2E Certificate Renamed')
        await page.getByRole('textbox').press('Enter')
        await expect(
            page.getByText('Nome atualizado com sucesso'),
        ).toBeVisible()

        // --- Verify updated name in listing ---
        await page.goto('/')
        await expect(page.getByText('E2E Certificate Renamed')).toBeVisible()

        // --- Navigate back to detail page and delete ---
        await page.getByText('E2E Certificate Renamed').click()
        await page.waitForURL(/\/certificados\/.+/)
        await page.getByTitle('Excluir certificado').click()
        await page.getByRole('button', { name: 'Continuar' }).click()
        await expect(
            page.getByText('Certificado excluído com sucesso'),
        ).toBeVisible()

        // --- Verify gone from listing ---
        await page.waitForURL('http://localhost:3001/')
        await expect(
            page.getByText('E2E Certificate Renamed'),
        ).not.toBeVisible()
        await expect(
            page.getByText('Nenhuma emissão de certificado criada'),
        ).toBeVisible()
    })
})
