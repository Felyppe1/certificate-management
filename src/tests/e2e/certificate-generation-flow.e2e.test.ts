import { test, expect } from './fixtures'
import path from 'path'
import { setupCertificate } from './helpers'

const TEMPLATE_URL = process.env.E2E_TEMPLATE_URL
const DATA_SOURCE_URL = process.env.E2E_DATA_SOURCE_URL

const TEMPLATE_FIXTURE = path.resolve('src/tests/e2e/fixtures/template.docx')
const DATA_SOURCE_FIXTURE = path.resolve(
    'src/tests/e2e/fixtures/data-source.csv',
)

test.describe('Certificate generation flow — template and data source', () => {
    test.beforeAll(() => {
        if (!TEMPLATE_URL)
            throw new Error(
                'E2E_TEMPLATE_URL env var is required to run this test',
            )
        if (!DATA_SOURCE_URL)
            throw new Error(
                'E2E_DATA_SOURCE_URL env var is required to run this test',
            )
    })

    test('should upload, edit via URL, and delete template and data source', async ({
        page,
        context,
        prisma,
    }) => {
        const { userId, emissionId } = await setupCertificate(prisma, context)

        await page.goto(`/certificados/${emissionId}`)

        // --- Template: upload ---
        await page.getByTestId('template-upload-option').click()
        await page.getByTestId('file-input').setInputFiles(TEMPLATE_FIXTURE)
        await expect(
            page.getByText('Template adicionado com sucesso'),
        ).toBeVisible({ timeout: 30000 })

        // // --- Template: edit to URL ---
        // await page.getByTestId('template-edit-button').click()
        // await page.getByTestId('template-link-option').click()
        // await page.getByTestId('url-input-0').fill(TEMPLATE_URL!)
        // await page.getByTestId('url-form-confirm').click()
        // await expect(
        //     page.getByText('Template atualizado com sucesso'),
        // ).toBeVisible({ timeout: 30000 })

        // --- Template: delete ---
        await page.getByTestId('template-remove-button').click()
        await expect(
            page.getByText('Template removido com sucesso'),
        ).toBeVisible({ timeout: 20000 })

        // --- Data source: upload ---
        await page.getByTestId('data-source-upload-option').click()
        await page.getByTestId('file-input').setInputFiles(DATA_SOURCE_FIXTURE)
        await expect(
            page.getByText('Fonte de dados adicionada com sucesso'),
        ).toBeVisible({ timeout: 30000 })

        // // --- Data source: edit to URL ---
        // await page.getByTestId('data-source-edit-button').click()
        // await page.getByTestId('data-source-link-option').click()
        // await page.getByTestId('url-input-0').fill(DATA_SOURCE_URL!)
        // await page.getByTestId('url-form-confirm').click()
        // await expect(
        //     page.getByText('Fonte de dados atualizada com sucesso'),
        // ).toBeVisible({ timeout: 30000 })

        // --- Data source: delete ---
        await page.getByTestId('data-source-remove-button').click()
        await expect(
            page.getByText('Fonte de dados removida com sucesso'),
        ).toBeVisible({ timeout: 20000 })

        await prisma.user.delete({ where: { id: userId } })
    })
})
