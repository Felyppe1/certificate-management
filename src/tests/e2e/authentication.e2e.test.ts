import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcrypt'
import { TIPS_STORAGE_KEY } from '@/app/(system)/certificados/[id]/_components/CertificatePageClient/components/TipsButton'

test.describe('Autenticação', () => {
    test('deve criar conta, verificar e-mail e ficar autenticado', async ({ page, context, prisma }) => {
        const email = faker.internet.email()
        const password = 'Senha@123'
        const name = faker.person.fullName()

        await context.addInitScript(
            key => localStorage.setItem(key, 'true'),
            TIPS_STORAGE_KEY,
        )

        await page.goto('/cadastrar-se')
        await page.getByLabel('Nome').fill(name)
        await page.getByLabel('E-mail').fill(email)
        await page.getByLabel('Senha', { exact: true }).fill(password)
        await page.getByLabel('Confirmar senha').fill(password)
        await page.getByTestId('signup-submit-button').click()

        await page.waitForURL(/verificar-email/, { timeout: 10000 })

        const user = await prisma.user.findFirstOrThrow({ where: { email } })
        const verificationRecord = await prisma.emailVerificationCode.findFirstOrThrow({
            where: { user_id: user.id },
        })

        await expect(page.getByTestId('verify-email-otp')).toBeVisible({ timeout: 10000 })
        await page.getByTestId('verify-email-otp').click()
        await page.keyboard.type(verificationRecord.code)

        await page.waitForURL('http://localhost:3001/', { timeout: 15000 })

        await page.getByTestId('user-dropdown-trigger').click()
        await page.getByTestId('logout-button').click()
        await page.waitForURL(/entrar/, { timeout: 10000 })

        await prisma.user.delete({ where: { id: user.id } })
    })

    test('deve exibir erro com senha inválida e permitir redefinição de senha', async ({ page, context, prisma }) => {
        const email = faker.internet.email()
        const originalPassword = 'Senha@123'
        const newPassword = 'NovaSenha@456'
        const userId = createId()

        await context.addInitScript(
            key => localStorage.setItem(key, 'true'),
            TIPS_STORAGE_KEY,
        )

        await prisma.user.create({
            data: {
                id: userId,
                email,
                name: faker.person.fullName(),
                password_hash: await bcrypt.hash(originalPassword, 10),
                is_email_verified: true,
            },
        })

        // Attempt login with wrong password
        await page.goto('/entrar')
        await page.getByLabel('E-mail').fill(email)
        await page.getByLabel('Senha').fill('senhaErrada')
        await page.getByTestId('login-submit-button').click()
        await expect(page.getByRole('alert')).toBeVisible()

        // Request password reset via forgot password popover
        await page.getByTestId('forgot-password-trigger').click()
        await page.locator('#reset-email').fill(email)
        await page.getByTestId('send-reset-code-button').click()
        await page.waitForURL(/resetar-senha/, { timeout: 10000 })

        // Get reset code from DB
        const userWithCode = await prisma.user.findFirstOrThrow({ where: { id: userId } })
        const resetCode = userWithCode.reset_password_code!

        // Validate code
        await expect(page.getByTestId('reset-code-otp')).toBeVisible({ timeout: 10000 })
        await page.getByTestId('reset-code-otp').click()
        await page.keyboard.type(resetCode)

        // Set new password
        await expect(page.getByLabel('Nova senha')).toBeVisible({ timeout: 10000 })
        await page.getByLabel('Nova senha').fill(newPassword)
        await page.getByLabel('Confirmar senha').fill(newPassword)
        await page.getByTestId('reset-password-submit-button').click()

        // Login with new password
        await page.waitForURL(/entrar/, { timeout: 10000 })
        await page.getByLabel('E-mail').fill(email)
        await page.getByLabel('Senha').fill(newPassword)
        await page.getByTestId('login-submit-button').click()
        await page.waitForURL('http://localhost:3001/', { timeout: 10000 })

        await page.getByTestId('user-dropdown-trigger').click()
        await page.getByTestId('logout-button').click()
        await page.waitForURL(/entrar/, { timeout: 10000 })

        await prisma.user.delete({ where: { id: userId } })
    })
})