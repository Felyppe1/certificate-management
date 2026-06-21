import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcrypt'
import { TIPS_STORAGE_KEY } from '@/app/(system)/certificados/[id]/_components/CertificatePageClient/components/TipsButton'
import { setupAuth, setupCertificate } from './helpers'

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

        // Limites inferiores: nome (2 chars), e-mail vazio, senha (5 chars)
        await page.getByLabel('Nome').fill('AB')
        await page.getByLabel('Senha', { exact: true }).fill('Ab@1x')
        await page.getByLabel('Confirmar senha').fill('Ab@1x')
        await page.getByTestId('signup-submit-button').click()
        await expect(page.getByText('Nome deve ter pelo menos 3 caracteres')).toBeVisible()
        await expect(page.getByText('Formato de email inválido')).toBeVisible()
        await expect(page.getByText('Senha deve ter pelo menos 6 caracteres')).toBeVisible()

        // Limites superiores: nome (101 chars), senha (101 chars), e-mail ainda vazio
        await page.getByLabel('Nome').fill('A'.repeat(101))
        await page.getByLabel('Senha', { exact: true }).fill('A'.repeat(101))
        await page.getByLabel('Confirmar senha').fill('A'.repeat(101))
        await page.getByTestId('signup-submit-button').click()
        await expect(page.getByText('Nome deve ter no máximo 100 caracteres')).toBeVisible()
        await expect(page.getByText('Senha deve ter no máximo 100 caracteres')).toBeVisible()

        // Valores válidos
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

        // Valor válido
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

        // Fronteira inferior (min-1): 5 caracteres
        await page.getByLabel('Nova senha').fill('Ab@1x')
        await page.getByTestId('reset-password-submit-button').click()
        await expect(page.getByText('Senha deve ter pelo menos 6 caracteres')).toBeVisible({ timeout: 5000 })

        // Fronteira superior (max+1): 101 caracteres
        await page.getByLabel('Nova senha').fill('A'.repeat(101))
        await page.getByTestId('reset-password-submit-button').click()
        await expect(page.getByText('Senha deve ter no máximo 100 caracteres')).toBeVisible({ timeout: 5000 })

        // Valor válido
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

    test('deve redirecionar para login quando não autenticado, testar fronteiras e proibir acesso a certificados de outros usuários', async ({ page, context, prisma }) => {
        const password = 'Senha@123'

        const { userId, email } = await setupAuth(prisma, context, password)
        const { userId: otherUserId, emissionId: otherEmissionId } = await setupCertificate(prisma, context)

        await context.clearCookies()

        // 1. Acesso não autenticado → redireciona para login
        await page.goto('/')
        await page.waitForURL(/entrar/, { timeout: 10000 })

        // 2. Limites inferiores: e-mail vazio + senha min-1 (5 chars)
        await page.getByLabel('Senha').fill('Ab@1x')
        await page.getByTestId('login-submit-button').click()
        await expect(page.getByText('Formato de email inválido')).toBeVisible()
        await expect(page.getByText('Senha deve ter pelo menos 6 caracteres')).toBeVisible()

        // 3. Limite superior da senha (max+1: 101 chars)
        await page.getByLabel('E-mail').fill(email)
        await page.getByLabel('Senha').fill('A'.repeat(101))
        await page.getByTestId('login-submit-button').click()
        await expect(page.getByText('Senha deve ter no máximo 100 caracteres')).toBeVisible()

        // 4. Login válido
        await page.getByLabel('Senha').fill(password)
        await page.getByTestId('login-submit-button').click()
        await page.waitForURL('http://localhost:3001/', { timeout: 10000 })

        // 5. Acesso a certificado de outro usuário → redireciona para home
        await page.goto(`/certificados/${otherEmissionId}`)
        await page.waitForURL('http://localhost:3001/', { timeout: 10000 })

        await prisma.user.delete({ where: { id: userId } })
        await prisma.user.delete({ where: { id: otherUserId } })
    })
})