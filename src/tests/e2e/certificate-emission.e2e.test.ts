import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import path from 'path'
import {
    setupAuth,
    setupCertificate,
    uploadTemplate,
    uploadDataSource,
} from './helpers'

const TEMPLATE_URL = process.env.E2E_TEMPLATE_URL
const DATA_SOURCE_URL = process.env.E2E_DATA_SOURCE_URL

// const TEMPLATE_FIXTURE = path.resolve('src/tests/e2e/fixtures/template.docx')
// const DATA_SOURCE_FIXTURE = path.resolve('src/tests/e2e/fixtures/data-source.csv')

test.describe('Emissão de certificado', () => {
    test('CRUD - deve criar, renomear, listar e excluir uma emissão de certificado', async ({
        page,
        context,
        prisma,
    }) => {
        const { userId } = await setupAuth(prisma, context)

        const initialName = faker.commerce.productName()
        const renamedName = `${initialName} Renammed`

        await page.goto('/')
        await page.getByTestId('create-emission-button').click()
        await page.getByLabel('Nome da emissão').fill(initialName)
        await page.getByTestId('create-emission-submit').click()
        await page.waitForURL(/\/certificados\/.+/)

        await page.getByTestId('certificate-edit-name-button').click()
        await page.getByRole('textbox').fill(renamedName)
        await page.getByRole('textbox').press('Enter')
        await expect(page.getByText('Nome atualizado com sucesso')).toBeVisible(
            { timeout: 20000 },
        )

        await page.goto('/')
        const emissionLink = page.getByRole('link', { name: renamedName })
        await expect(emissionLink).toBeVisible()

        await emissionLink.click()
        await page.waitForURL(/\/certificados\/.+/)
        await page.getByTestId('certificate-delete-button').click()
        const continueButton = page.getByTestId('warning-popover-confirm')
        await expect(continueButton).toBeVisible()
        await continueButton.click()
        await expect(
            page.getByText('Certificado excluído com sucesso'),
        ).toBeVisible({ timeout: 10000 })

        await page.waitForURL('http://localhost:3001/')
        await expect(emissionLink).not.toBeVisible()
        await expect(
            page.getByText('Nenhuma emissão de certificado criada'),
        ).toBeVisible()

        await prisma.user.delete({ where: { id: userId } })
    })

    test('deve realizar o fluxo completo de geração e emissão de certificados', async ({
        page,
        context,
        prisma,
    }) => {
        const { userId, emissionId } = await setupCertificate(prisma, context)

        await page.goto(`/certificados/${emissionId}`)

        await uploadTemplate(page)
        await uploadDataSource(page)

        // Map the two variables not auto-mapped
        await page.getByTestId('mapping-select-nome').click()
        await page.getByRole('option', { name: 'Nome Participante' }).click()
        await page.getByTestId('mapping-select-data').click()
        await page.getByRole('option', { name: 'Data do Evento' }).click()
        await page.getByTestId('mapping-save-button').click()
        await expect(page.getByText('Mapeamento salvo com sucesso')).toBeVisible({ timeout: 10000 })

        await page.getByTestId('generate-certificates-button').click()
        await expect(page.getByText('Gerando certificados...')).toBeVisible({ timeout: 10000 })

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: emissionId },
            select: { id: true },
        })

        for (const row of rows) {
            await page.request.fetch(`/api/internal/data-source-rows/${row.id}/generations`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                data: { success: true, totalBytes: 1024, userId },
            })
        }

        await expect(page.getByText('A geração de certificados finalizou')).toBeVisible({ timeout: 10000 })

        await page.getByTestId('email-column-select').click()
        await page.getByRole('option', { name: 'E-mail' }).click()
        await page.locator('#email-subject-now').fill('Seu certificado está pronto!')
        await page.getByTestId('email-body-editor').locator('[contenteditable="true"]').click()
        await page.keyboard.type('Olá! Seu certificado está disponível em anexo.')
        await page.getByTestId('email-send-button').click()

        const email = await prisma.email.findFirst({
            where: { certificate_emission_id: emissionId },
            select: { id: true },
        })

        if (email) {
            await page.request.fetch(`/api/internal/emails/${email.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                data: { status: 'COMPLETED', emailsSentCount: rows.length, userId },
            })
        }

        await expect(page.getByTestId('toaster').getByText('Emails enviados com sucesso')).toBeVisible({ timeout: 10000 })

        await prisma.user.delete({ where: { id: userId } })
    })

    test('deve adicionar template por upload, editar por url e excluir', async ({
        page,
        context,
        prisma,
    }) => {
        if (!TEMPLATE_URL)
            throw new Error(
                'E2E_TEMPLATE_URL env var is required to run this test',
            )

        const { userId, emissionId } = await setupCertificate(prisma, context)

        await page.goto(`/certificados/${emissionId}`)

        await uploadTemplate(page)

        // await page.getByTestId('template-edit-button').click()
        // await page.getByTestId('template-link-option').click()
        // await page.getByTestId('url-input-0').fill(TEMPLATE_URL!)
        // await page.getByTestId('url-form-confirm').click()
        // await expect(page.getByText('Template atualizado com sucesso')).toBeVisible({ timeout: 10000 })

        await page.getByTestId('template-remove-button').click()
        await expect(
            page.getByText('Template removido com sucesso'),
        ).toBeVisible({ timeout: 10000 })

        await prisma.user.delete({ where: { id: userId } })
    })

    test('deve adicionar fonte de dados por upload, editar por url, alterar coluna e excluir', async ({
        page,
        context,
        prisma,
    }) => {
        if (!DATA_SOURCE_URL)
            throw new Error(
                'E2E_DATA_SOURCE_URL env var is required to run this test',
            )

        const { userId, emissionId } = await setupCertificate(prisma, context)

        await page.goto(`/certificados/${emissionId}`)

        await uploadDataSource(page)

        // await page.getByTestId('data-source-edit-button').click()
        // await page.getByTestId('data-source-link-option').click()
        // await page.getByTestId('url-input-0').fill(DATA_SOURCE_URL!)
        // await page.getByTestId('url-form-confirm').click()
        // await expect(page.getByText('Fonte de dados atualizada com sucesso')).toBeVisible({ timeout: 10000 })

        await page.getByTestId('column-header-palestras').click()
        await page.getByTestId('column-type-option-array').click()
        await page.getByTestId('column-array-separator-input').fill('/')
        await page.keyboard.press('Escape')
        await page.getByTestId('columns-save-button').click()
        await expect(
            page.getByText('Configuração salva com sucesso'),
        ).toBeVisible({ timeout: 10000 })

        await page.getByTestId('data-source-remove-button').click()
        await expect(
            page.getByText('Fonte de dados removida com sucesso'),
        ).toBeVisible({ timeout: 10000 })

        await prisma.user.delete({ where: { id: userId } })
    })
})
