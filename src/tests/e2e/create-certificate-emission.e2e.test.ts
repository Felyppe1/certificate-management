import { test, expect } from './fixtures'
import crypto from 'crypto'

test.describe('Criação de emissão de certificado (E2E)', () => {
    test('deve criar uma emissão e redirecionar para /certificados/{id}', async ({
        page,
        context,
        prisma,
    }) => {
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        await prisma.user.create({
            data: {
                id: 'user-e2e-1',
                email: 'e2e@test.com',
                name: 'E2E User',
                password_hash: 'hash',
            },
        })
        await prisma.session.create({
            data: {
                token,
                user_id: 'user-e2e-1',
                expires_at: expiresAt,
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

        await page.goto('/')

        await page.getByRole('button', { name: 'Criar' }).first().click()

        await page
            .getByLabel('Nome da emissão')
            .fill('Certificado de Conclusão E2E')

        await page.getByRole('button', { name: 'Criar Emissão' }).click()

        await page.waitForURL(/\/certificados\/.+/)

        expect(page.url()).toMatch(/\/certificados\/.+/)
    })
})
