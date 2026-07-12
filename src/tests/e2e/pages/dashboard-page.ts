import { Locator, Page } from '@playwright/test'

// Home / emissions listing (`/`).
export class DashboardPage {
    constructor(private readonly page: Page) {}

    async goto() {
        await this.page.goto('/')
    }

    async openCreateEmission() {
        await this.page.getByTestId('create-emission-button').click()
    }

    async fillEmissionName(name: string) {
        await this.page.getByLabel('Nome da emissão').fill(name)
    }

    async submitCreateEmission() {
        await this.page.getByTestId('create-emission-submit').click()
    }

    get nameRequiredError(): Locator {
        return this.page.getByText('Esse campo é obrigatório')
    }

    get nameMaxError(): Locator {
        return this.page.getByText('Máximo de 100 caracteres ultrapassado')
    }

    // Link to an emission in the listing, by name.
    emissionLink(name: string): Locator {
        return this.page.getByRole('link', { name })
    }

    get emptyMessage(): Locator {
        return this.page.getByText('Nenhuma emissão de certificado criada')
    }
}
