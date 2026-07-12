import { Locator, Page } from '@playwright/test'
import { BASE_URL } from '../config'

// Login screen (`/entrar`).
export class LoginPage {
    constructor(private readonly page: Page) {}

    async goto() {
        await this.page.goto('/entrar')
    }

    async fillEmail(email: string) {
        await this.page.getByLabel('E-mail').fill(email)
    }

    async fillPassword(password: string) {
        await this.page.getByLabel('Senha').fill(password)
    }

    async submit() {
        await this.page.getByTestId('login-submit-button').click()
    }

    // Fills valid credentials, submits and waits to land on the authenticated home.
    async login(email: string, password: string) {
        await this.fillEmail(email)
        await this.fillPassword(password)
        await this.submit()
        await this.page.waitForURL(`${BASE_URL}/`)
    }

    get invalidCredentialsError(): Locator {
        return this.page.getByRole('alert')
    }

    get emailFormatError(): Locator {
        return this.page.getByText('Formato de email inválido')
    }

    get passwordMinError(): Locator {
        return this.page.getByText('Senha deve ter pelo menos 6 caracteres')
    }

    get passwordMaxError(): Locator {
        return this.page.getByText('Senha deve ter no máximo 100 caracteres')
    }

    // Opens the "forgot password" popover, requests the code and navigates to the reset screen.
    async requestPasswordReset(email: string) {
        await this.page.getByTestId('forgot-password-trigger').click()
        await this.page.locator('#reset-email').fill(email)
        await this.page.getByTestId('send-reset-code-button').click()
        await this.page.waitForURL(/resetar-senha/)
    }
}
