import { Page } from '@playwright/test'

// Shared component: user dropdown in the navbar (logout).
export class Navbar {
    constructor(private readonly page: Page) {}

    async logout() {
        await this.page.getByTestId('user-dropdown-trigger').click()
        await this.page.getByTestId('logout-button').click()
        await this.page.waitForURL(/entrar/)
    }
}
