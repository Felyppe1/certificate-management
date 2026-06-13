import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { setupAuth } from './helpers'

test.describe('Gerenciamento de conta', () => {
    test('deve atualizar nome, e-mail e senha do perfil', async ({ page, context, prisma }) => {
        const originalPassword = 'Senha@123'
        const newPassword = 'NovaSenha@456'
        const newEmail = faker.internet.email()
        const newName = faker.person.fullName()

        const { userId, email } = await setupAuth(prisma, context, originalPassword)

        await page.goto(`/usuarios/${userId}/configuracoes`)

        // 1. Atualizar nome
        await page.getByLabel('Nome').fill(newName)
        await page.getByTestId('basic-name-save-button').click()
        await expect(page.getByText('Nome atualizado.')).toBeVisible({ timeout: 10000 })

        // 2. Alterar e-mail
        await page.getByTestId('change-email-toggle').click()
        await page.getByTestId('new-email-input').fill(newEmail)
        await page.getByTestId('save-email-button').click()
        await expect(page.getByTestId('verify-email-change-button')).toBeVisible({ timeout: 10000 })

        const emailChangeRecord = await prisma.emailChange.findFirstOrThrow({ where: { user_id: userId } })
        await expect(page.getByTestId('change-email-otp')).toBeVisible({ timeout: 10000 })
        await page.getByTestId('change-email-otp').click()
        await page.keyboard.type(emailChangeRecord.code)
        await expect(page.getByText('E-mail atualizado com sucesso.')).toBeVisible({ timeout: 10000 })

        // Logout e login com novo e-mail
        await page.getByTestId('user-dropdown-trigger').click()
        await page.getByTestId('logout-button').click()
        await page.waitForURL(/entrar/, { timeout: 10000 })
        await page.getByLabel('E-mail').fill(newEmail)
        await page.getByLabel('Senha').fill(originalPassword)
        await page.getByTestId('login-submit-button').click()
        await page.waitForURL('http://localhost:3001/', { timeout: 10000 })

        // 3. Alterar senha
        await page.goto(`/usuarios/${userId}/configuracoes`)
        await page.getByTestId('change-password-toggle').click()
        await page.getByLabel('Senha Atual').fill(originalPassword)
        await page.getByTestId('new-password-input').fill(newPassword)
        await page.getByTestId('confirm-new-password-input').fill(newPassword)
        await page.getByTestId('save-password-button').click()
        await expect(page.getByText('Senha atualizada com sucesso.')).toBeVisible({ timeout: 10000 })

        // Logout e login com nova senha
        await page.getByTestId('user-dropdown-trigger').click()
        await page.getByTestId('logout-button').click()
        await page.waitForURL(/entrar/, { timeout: 10000 })
        await page.getByLabel('E-mail').fill(newEmail)
        await page.getByLabel('Senha').fill(newPassword)
        await page.getByTestId('login-submit-button').click()
        await page.waitForURL('http://localhost:3001/', { timeout: 10000 })

        await prisma.user.delete({ where: { id: userId } })
    })
})
