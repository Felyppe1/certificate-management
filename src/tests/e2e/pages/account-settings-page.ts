import { Locator, Page } from '@playwright/test'

// Account settings screen (`/usuarios/{userId}/configuracoes`).
export class AccountSettingsPage {
    constructor(private readonly page: Page) {}

    async goto(userId: string) {
        await this.page.goto(`/usuarios/${userId}/configuracoes`)
    }

    // --- Name ---

    private get nameInput(): Locator {
        return this.page.getByTestId('basic-name-input')
    }

    // Replaces the name field's content (selects all and types).
    async fillName(value: string) {
        await this.nameInput.click()
        await this.page.keyboard.press('Control+a')
        await this.page.keyboard.type(value)
    }

    async saveName() {
        await this.page.getByTestId('basic-name-save-button').click()
    }

    get nameMinError(): Locator {
        return this.page.getByText('Mínimo de 3 caracteres')
    }

    get nameMaxError(): Locator {
        return this.page.getByText('Máximo de 100 caracteres')
    }

    get nameSuccess(): Locator {
        return this.page.getByText('Nome atualizado.')
    }

    // --- Email change ---

    async openEmailChange() {
        await this.page.getByTestId('change-email-toggle').click()
    }

    async fillNewEmail(email: string) {
        await this.page.getByTestId('new-email-input').fill(email)
    }

    async saveEmail() {
        await this.page.getByTestId('save-email-button').click()
    }

    get verifyEmailChangeButton(): Locator {
        return this.page.getByTestId('verify-email-change-button')
    }

    async fillEmailChangeCode(code: string) {
        await this.page.getByTestId('change-email-otp').click()
        await this.page.keyboard.type(code)
    }

    get emailChangeSuccess(): Locator {
        return this.page.getByText('E-mail atualizado com sucesso.')
    }

    // --- Password change ---

    async openPasswordChange() {
        await this.page.getByTestId('change-password-toggle').click()
    }

    async fillCurrentPassword(password: string) {
        await this.page.getByLabel('Senha Atual').fill(password)
    }

    async fillNewPassword(password: string) {
        await this.page.getByTestId('new-password-input').fill(password)
    }

    async fillConfirmNewPassword(password: string) {
        await this.page.getByTestId('confirm-new-password-input').fill(password)
    }

    async savePassword() {
        await this.page.getByTestId('save-password-button').click()
    }

    get passwordMinError(): Locator {
        return this.page.getByText('Mínimo de 6 caracteres')
    }

    get passwordMaxError(): Locator {
        return this.page.getByText('Máximo de 100 caracteres')
    }

    get passwordSuccess(): Locator {
        return this.page.getByText('Senha atualizada com sucesso.')
    }
}
