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
        const nameInput = page.getByTestId('basic-name-input')

        // Fronteira inferior (min-1): 2 caracteres
        await nameInput.click()
        await page.keyboard.press('Control+a')
        await page.keyboard.type('AB')
        await page.getByTestId('basic-name-save-button').click()
        await expect(page.getByText('Mínimo de 3 caracteres')).toBeVisible()

        // Fronteira superior (max+1): 101 caracteres
        await nameInput.click()
        await page.keyboard.press('Control+a')
        await page.keyboard.type('A'.repeat(101))
        await page.getByTestId('basic-name-save-button').click()
        await expect(page.getByText('Máximo de 100 caracteres')).toBeVisible()

        // Valor válido
        await nameInput.click()
        await page.keyboard.press('Control+a')
        await page.keyboard.type(newName)
        await page.getByTestId('basic-name-save-button').click()
        await expect(page.getByText('Nome atualizado.')).toBeVisible({ timeout: 10000 })

        // 2. Alterar e-mail
        await page.getByTestId('change-email-toggle').click()

        // Valor válido
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

        // Fronteira inferior da nova senha (min-1): 5 caracteres
        await page.getByTestId('new-password-input').fill('Ab@1x')
        await page.getByTestId('save-password-button').click()
        await expect(page.getByText('Mínimo de 6 caracteres')).toBeVisible()

        // Fronteira superior da nova senha (max+1): 101 caracteres
        await page.getByTestId('new-password-input').fill('A'.repeat(101))
        await page.getByTestId('save-password-button').click()
        await expect(page.getByText('Máximo de 100 caracteres')).toBeVisible()

        // Valor válido
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