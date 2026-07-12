import { Locator, Page } from '@playwright/test'

// Sign-up screen (`/cadastrar-se`).
export class SignUpPage {
    constructor(private readonly page: Page) {}

    async goto() {
        await this.page.goto('/cadastrar-se')
    }

    async fillName(name: string) {
        await this.page.getByLabel('Nome').fill(name)
    }

    async fillEmail(email: string) {
        await this.page.getByLabel('E-mail').fill(email)
    }

    async fillPassword(password: string) {
        await this.page.getByLabel('Senha', { exact: true }).fill(password)
    }

    async fillConfirmPassword(password: string) {
        await this.page.getByLabel('Confirmar senha').fill(password)
    }

    async submit() {
        await this.page.getByTestId('signup-submit-button').click()
    }

    // Fills the full form with valid data and submits.
    async signUp(input: { name: string; email: string; password: string }) {
        await this.fillName(input.name)
        await this.fillEmail(input.email)
        await this.fillPassword(input.password)
        await this.fillConfirmPassword(input.password)
        await this.submit()
    }

    get nameMinError(): Locator {
        return this.page.getByText('Nome deve ter pelo menos 3 caracteres')
    }

    get nameMaxError(): Locator {
        return this.page.getByText('Nome deve ter no máximo 100 caracteres')
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
}
