import { Locator, Page } from '@playwright/test'

// Email verification screen (`/verificar-email`).
export class VerifyEmailPage {
    constructor(private readonly page: Page) {}

    get otp(): Locator {
        return this.page.getByTestId('verify-email-otp')
    }

    // Types the verification code into the OTP field.
    async fillCode(code: string) {
        await this.otp.click()
        await this.page.keyboard.type(code)
    }
}
