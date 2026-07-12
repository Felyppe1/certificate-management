import { Locator, Page } from '@playwright/test'

// Password reset screen (`/resetar-senha`).
export class ResetPasswordPage {
    constructor(private readonly page: Page) {}

    get otp(): Locator {
        return this.page.getByTestId('reset-code-otp')
    }

    // Types the reset code into the OTP field.
    async fillCode(code: string) {
        await this.otp.click()
        await this.page.keyboard.type(code)
    }

    get newPasswordInput(): Locator {
        return this.page.getByLabel('Nova senha')
    }

    async fillNewPassword(password: string) {
        await this.newPasswordInput.fill(password)
    }

    async fillConfirmPassword(password: string) {
        await this.page.getByLabel('Confirmar senha').fill(password)
    }

    async submit() {
        await this.page.getByTestId('reset-password-submit-button').click()
    }

    get passwordMinError(): Locator {
        return this.page.getByText('Senha deve ter pelo menos 6 caracteres')
    }

    get passwordMaxError(): Locator {
        return this.page.getByText('Senha deve ter no máximo 100 caracteres')
    }
}
