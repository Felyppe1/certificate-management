import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { DEFAULT_PASSWORD } from './config'

test.describe('Gerenciamento de conta', () => {
    test('deve atualizar nome, e-mail e senha do perfil', async ({
        prisma,
        authProviderClient,
        accountSettingsPage,
        loginPage,
        navbar,
    }) => {
        const originalPassword = DEFAULT_PASSWORD
        const newPassword = 'NovaSenha@456'
        const newEmail = faker.internet.email()
        const newName = faker.person.fullName()

        const { userId } = await authProviderClient.createUser({
            password: originalPassword,
        })
        await authProviderClient.authenticate(userId)

        await accountSettingsPage.goto(userId)

        // 1. Update name
        // Lower boundary (min-1): 2 characters
        await accountSettingsPage.fillName('AB')
        await accountSettingsPage.saveName()
        await expect(accountSettingsPage.nameMinError).toBeVisible()

        // Upper boundary (max+1): 101 characters
        await accountSettingsPage.fillName('A'.repeat(101))
        await accountSettingsPage.saveName()
        await expect(accountSettingsPage.nameMaxError).toBeVisible()

        // Valid value
        await accountSettingsPage.fillName(newName)
        await accountSettingsPage.saveName()
        await expect(accountSettingsPage.nameSuccess).toBeVisible()

        // 2. Change email
        await accountSettingsPage.openEmailChange()
        await accountSettingsPage.fillNewEmail(newEmail)
        await accountSettingsPage.saveEmail()
        await expect(accountSettingsPage.verifyEmailChangeButton).toBeVisible()

        const emailChangeRecord = await prisma.emailChange.findFirstOrThrow({
            where: { user_id: userId },
        })
        await accountSettingsPage.fillEmailChangeCode(emailChangeRecord.code)
        await expect(accountSettingsPage.emailChangeSuccess).toBeVisible()

        // Logout and login with the new email
        await navbar.logout()
        await loginPage.login(newEmail, originalPassword)

        // 3. Change password
        await accountSettingsPage.goto(userId)
        await accountSettingsPage.openPasswordChange()
        await accountSettingsPage.fillCurrentPassword(originalPassword)

        // New password lower boundary (min-1): 5 characters
        await accountSettingsPage.fillNewPassword('Ab@1x')
        await accountSettingsPage.savePassword()
        await expect(accountSettingsPage.passwordMinError).toBeVisible()

        // New password upper boundary (max+1): 101 characters
        await accountSettingsPage.fillNewPassword('A'.repeat(101))
        await accountSettingsPage.savePassword()
        await expect(accountSettingsPage.passwordMaxError).toBeVisible()

        // Valid value
        await accountSettingsPage.fillNewPassword(newPassword)
        await accountSettingsPage.fillConfirmNewPassword(newPassword)
        await accountSettingsPage.savePassword()
        await expect(accountSettingsPage.passwordSuccess).toBeVisible()

        // Logout and login with the new password
        await navbar.logout()
        await loginPage.login(newEmail, newPassword)
    })
})
