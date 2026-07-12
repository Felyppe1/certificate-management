import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { BASE_URL } from './config'
import { createEmission } from './helpers/auth-helpers'

const TEMPLATE_URL = process.env.E2E_TEMPLATE_URL
const DATA_SOURCE_URL = process.env.E2E_DATA_SOURCE_URL

test.describe('Emissão de certificado', () => {
    // Depends on a user with no emissions (empty-list assertion), so it uses its
    // own isolated user instead of the worker's shared user.
    test('CRUD - deve criar, renomear, listar e excluir uma emissão de certificado', async ({
        page,
        authProviderClient,
        dashboardPage,
        certificatePage,
    }) => {
        const { userId } = await authProviderClient.createUser()
        await authProviderClient.authenticate(userId)

        const initialName = faker.commerce.productName()
        const renamedName = `${initialName} Renammed`

        await dashboardPage.goto()
        await dashboardPage.openCreateEmission()

        // Lower boundary (min-1): empty name
        await dashboardPage.submitCreateEmission()
        await expect(dashboardPage.nameRequiredError).toBeVisible()

        // Upper boundary (max+1): 101 characters
        await dashboardPage.fillEmissionName('A'.repeat(101))
        await dashboardPage.submitCreateEmission()
        await expect(dashboardPage.nameMaxError).toBeVisible()

        // Valid value
        await dashboardPage.fillEmissionName(initialName)
        await dashboardPage.submitCreateEmission()
        await page.waitForURL(/\/certificados\/.+/)

        await certificatePage.openEditName()

        // Lower boundary (min-1): empty name
        await certificatePage.submitName('')
        await expect(certificatePage.nameEmptyError).toBeVisible()

        // Upper boundary (max+1): 101 characters
        await certificatePage.submitName('A'.repeat(101))
        await expect(certificatePage.nameMaxError).toBeVisible()

        // Valid value
        await certificatePage.submitName(renamedName)
        await expect(certificatePage.renameSuccess).toBeVisible()

        await dashboardPage.goto()
        const emissionLink = dashboardPage.emissionLink(renamedName)
        await expect(emissionLink).toBeVisible()

        await emissionLink.click()
        await page.waitForURL(/\/certificados\/.+/)

        await certificatePage.delete()
        await expect(certificatePage.deleteSuccess).toBeVisible()

        await page.waitForURL(`${BASE_URL}/`)
        await expect(emissionLink).not.toBeVisible()
        await expect(dashboardPage.emptyMessage).toBeVisible()
    })

    test('deve realizar o fluxo completo de geração e emissão de certificados', async ({
        page,
        prisma,
        loggedInUser,
        certificatePage,
    }) => {
        const { emissionId } = await createEmission(prisma, loggedInUser.userId)

        await certificatePage.goto(emissionId)

        await certificatePage.uploadTemplate()
        await certificatePage.uploadDataSource()

        // Map the two variables that were not auto-mapped
        await certificatePage.mapVariable('nome', 'Nome Participante')
        await certificatePage.mapVariable('data', 'Data do Evento')
        await certificatePage.saveMapping()
        await expect(certificatePage.mappingSuccess).toBeVisible()

        await certificatePage.generate()
        await expect(certificatePage.generatingMessage).toBeVisible()

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: emissionId },
            select: { id: true },
        })

        for (const row of rows) {
            await page.request.fetch(
                `/api/internal/data-source-rows/${row.id}/generations`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        success: true,
                        totalBytes: 1024,
                        userId: loggedInUser.userId,
                    },
                },
            )
        }

        await expect(certificatePage.generationFinished).toBeVisible()

        // Step 1: no fields filled — validates required fields
        await certificatePage.sendEmail()
        await expect(certificatePage.emailColumnRequiredError).toBeVisible()
        await expect(certificatePage.subjectRequiredError).toBeVisible()
        await expect(certificatePage.bodyRequiredError).toBeVisible()

        // Step 2: subject (max+1: 256) and body (max+1: 801) upper boundaries
        await certificatePage.selectEmailColumn('E-mail')
        await certificatePage.fillSubject('A'.repeat(256))
        await certificatePage.typeBody('A'.repeat(801))
        await certificatePage.sendEmail()
        await expect(certificatePage.subjectMaxError).toBeVisible()
        await expect(certificatePage.bodyMaxError).toBeVisible()

        // Step 3: valid flow — fixes subject and replaces body
        await certificatePage.fillSubject('Seu certificado está pronto!')
        await certificatePage.replaceBody(
            'Olá! Seu certificado está disponível em anexo.',
        )
        await certificatePage.sendEmail()

        const email = await prisma.email.findFirst({
            where: { certificate_emission_id: emissionId },
            select: { id: true },
        })

        if (email) {
            await page.request.fetch(`/api/internal/emails/${email.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                data: {
                    status: 'COMPLETED',
                    emailsSentCount: rows.length,
                    userId: loggedInUser.userId,
                },
            })
        }

        await expect(certificatePage.emailSentSuccess).toBeVisible()
    })

    test('deve adicionar template por upload, editar por url e excluir', async ({
        prisma,
        loggedInUser,
        certificatePage,
    }) => {
        if (!TEMPLATE_URL)
            throw new Error(
                'E2E_TEMPLATE_URL env var is required to run this test',
            )

        const { emissionId } = await createEmission(prisma, loggedInUser.userId)

        await certificatePage.goto(emissionId)

        await certificatePage.uploadTemplate()

        await certificatePage.removeTemplate()
        await expect(certificatePage.templateRemovedSuccess).toBeVisible()
    })

    test('deve adicionar fonte de dados por upload, editar por url, alterar coluna e excluir', async ({
        prisma,
        loggedInUser,
        certificatePage,
    }) => {
        if (!DATA_SOURCE_URL)
            throw new Error(
                'E2E_DATA_SOURCE_URL env var is required to run this test',
            )

        const { emissionId } = await createEmission(prisma, loggedInUser.userId)

        await certificatePage.goto(emissionId)

        await certificatePage.uploadDataSource()

        await certificatePage.configureColumnAsArray('palestras', '/')
        await expect(certificatePage.columnConfigSuccess).toBeVisible()

        await certificatePage.removeDataSource()
        await expect(certificatePage.dataSourceRemovedSuccess).toBeVisible()
    })
})
