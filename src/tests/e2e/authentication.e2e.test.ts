import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { BASE_URL, DEFAULT_PASSWORD } from './config'
import { createEmission } from './helpers/auth-helpers'

test.describe('Autenticação', () => {
    test('deve criar conta, verificar e-mail e ficar autenticado', async ({
        page,
        prisma,
        signUpPage,
        verifyEmailPage,
        navbar,
    }) => {
        const email = faker.internet.email()
        const password = DEFAULT_PASSWORD
        const name = faker.person.fullName()

        await signUpPage.goto()

        // Lower boundaries: name (2 chars), empty email, password (5 chars)
        await signUpPage.fillName('AB')
        await signUpPage.fillPassword('Ab@1x')
        await signUpPage.fillConfirmPassword('Ab@1x')
        await signUpPage.submit()
        await expect(signUpPage.nameMinError).toBeVisible()
        await expect(signUpPage.emailFormatError).toBeVisible()
        await expect(signUpPage.passwordMinError).toBeVisible()

        // Upper boundaries: name (101 chars), password (101 chars), email still empty
        await signUpPage.fillName('A'.repeat(101))
        await signUpPage.fillPassword('A'.repeat(101))
        await signUpPage.fillConfirmPassword('A'.repeat(101))
        await signUpPage.submit()
        await expect(signUpPage.nameMaxError).toBeVisible()
        await expect(signUpPage.passwordMaxError).toBeVisible()

        // Valid values
        await signUpPage.signUp({ name, email, password })

        await page.waitForURL(/verificar-email/)

        const user = await prisma.user.findFirstOrThrow({ where: { email } })
        const verificationRecord =
            await prisma.emailVerificationCode.findFirstOrThrow({
                where: { user_id: user.id },
            })

        await expect(verifyEmailPage.otp).toBeVisible()
        await verifyEmailPage.fillCode(verificationRecord.code)

        await page.waitForURL(`${BASE_URL}/`)

        await navbar.logout()
    })

    test('deve exibir erro com senha inválida e permitir redefinição de senha', async ({
        page,
        prisma,
        authProviderClient,
        loginPage,
        resetPasswordPage,
        navbar,
    }) => {
        const originalPassword = DEFAULT_PASSWORD
        const newPassword = 'NovaSenha@456'

        const { userId, email } = await authProviderClient.createUser({
            password: originalPassword,
        })

        // Attempt login with wrong password
        await loginPage.goto()
        await loginPage.fillEmail(email)
        await loginPage.fillPassword('senhaErrada')
        await loginPage.submit()
        await expect(loginPage.invalidCredentialsError).toBeVisible()

        // Request password reset
        await loginPage.requestPasswordReset(email)

        const userWithCode = await prisma.user.findFirstOrThrow({
            where: { id: userId },
        })
        const resetCode = userWithCode.reset_password_code!

        await expect(resetPasswordPage.otp).toBeVisible()
        await resetPasswordPage.fillCode(resetCode)

        await expect(resetPasswordPage.newPasswordInput).toBeVisible()

        // Lower boundary (min-1): 5 characters
        await resetPasswordPage.fillNewPassword('Ab@1x')
        await resetPasswordPage.submit()
        await expect(resetPasswordPage.passwordMinError).toBeVisible()

        // Upper boundary (max+1): 101 characters
        await resetPasswordPage.fillNewPassword('A'.repeat(101))
        await resetPasswordPage.submit()
        await expect(resetPasswordPage.passwordMaxError).toBeVisible()

        // Valid value
        await resetPasswordPage.fillNewPassword(newPassword)
        await resetPasswordPage.fillConfirmPassword(newPassword)
        await resetPasswordPage.submit()

        // Login with the new password
        await page.waitForURL(/entrar/)
        await loginPage.login(email, newPassword)

        await navbar.logout()
    })

    test('deve redirecionar para login quando não autenticado, testar fronteiras e proibir acesso a certificados de outros usuários', async ({
        page,
        prisma,
        authProviderClient,
        loginPage,
    }) => {
        const password = DEFAULT_PASSWORD

        const { email } = await authProviderClient.createUser({ password })
        const otherUser = await authProviderClient.createUser({ password })
        const { emissionId: otherEmissionId } = await createEmission(
            prisma,
            otherUser.userId,
        )

        // 1. Unauthenticated access → redirects to login
        await page.goto('/')
        await page.waitForURL(/entrar/)

        // 2. Lower boundaries: empty email + password min-1 (5 chars)
        await loginPage.fillPassword('Ab@1x')
        await loginPage.submit()
        await expect(loginPage.emailFormatError).toBeVisible()
        await expect(loginPage.passwordMinError).toBeVisible()

        // 3. Password upper boundary (max+1: 101 chars)
        await loginPage.fillEmail(email)
        await loginPage.fillPassword('A'.repeat(101))
        await loginPage.submit()
        await expect(loginPage.passwordMaxError).toBeVisible()

        // 4. Valid login
        await loginPage.login(email, password)

        // 5. Access to another user's certificate → redirects to home
        await page.goto(`/certificados/${otherEmissionId}`)
        await page.waitForURL(`${BASE_URL}/`)
    })
})
