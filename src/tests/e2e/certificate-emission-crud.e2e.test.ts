import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { setupAuth } from './helpers'

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
        await page.getByTestId('create-emission-button').click()
        await page.getByLabel('Nome da emissão').fill(initialName)
        await page.getByTestId('create-emission-submit').click()
        await page.waitForURL(/\/certificados\/.+/)

        // --- Rename ---
        await page.getByTestId('certificate-edit-name-button').click()
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
        await page.getByTestId('certificate-delete-button').click()
        const continueButton = page.getByTestId('warning-popover-confirm')
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
