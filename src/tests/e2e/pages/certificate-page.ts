import { Locator, Page, expect } from '@playwright/test'
import path from 'path'

const TEMPLATE_FIXTURE = path.resolve('src/tests/e2e/assets/template.docx')
const DATA_SOURCE_FIXTURE = path.resolve('src/tests/e2e/assets/data-source.csv')

// Certificate emission detail screen (`/certificados/{id}`).
export class CertificatePage {
    constructor(private readonly page: Page) {}

    async goto(emissionId: string) {
        await this.page.goto(`/certificados/${emissionId}`)
    }

    // --- Rename ---

    async openEditName() {
        await this.page.getByTestId('certificate-edit-name-button').click()
    }

    // Fills the inline name field and confirms with Enter.
    async submitName(value: string) {
        const textbox = this.page.getByRole('textbox')
        await textbox.fill(value)
        await textbox.press('Enter')
    }

    get nameEmptyError(): Locator {
        return this.page.getByText('O nome não pode ser vazio')
    }

    get nameMaxError(): Locator {
        return this.page.getByText('O nome deve ter no máximo 100 caracteres')
    }

    get renameSuccess(): Locator {
        return this.page.getByText('Nome atualizado com sucesso')
    }

    // --- Delete ---

    async delete() {
        await this.page.getByTestId('certificate-delete-button').click()
        const confirmButton = this.page.getByTestId('warning-popover-confirm')
        await expect(confirmButton).toBeVisible()
        await confirmButton.click()
    }

    get deleteSuccess(): Locator {
        return this.page.getByText('Certificado excluído com sucesso')
    }

    // --- Template ---

    // Uploads the template file and waits for the success confirmation.
    async uploadTemplate() {
        await this.page.getByTestId('template-upload-option').click()
        await this.page
            .getByTestId('file-input')
            .setInputFiles(TEMPLATE_FIXTURE)
        await expect(
            this.page.getByText('Template adicionado com sucesso'),
        ).toBeVisible()
    }

    async removeTemplate() {
        await this.page.getByTestId('template-remove-button').click()
    }

    get templateRemovedSuccess(): Locator {
        return this.page.getByText('Template removido com sucesso')
    }

    // --- Data source ---

    // Uploads the data source file and waits for the success confirmation.
    async uploadDataSource() {
        await this.page.getByTestId('data-source-upload-option').click()
        await this.page
            .getByTestId('file-input')
            .setInputFiles(DATA_SOURCE_FIXTURE)
        await expect(
            this.page.getByText('Fonte de dados adicionada com sucesso'),
        ).toBeVisible()
    }

    // Configures a column as an array with the given separator.
    async configureColumnAsArray(columnName: string, separator: string) {
        await this.page.getByTestId(`column-header-${columnName}`).click()
        await this.page.getByTestId('column-type-option-array').click()
        await this.page
            .getByTestId('column-array-separator-input')
            .fill(separator)
        await this.page.keyboard.press('Escape')
        await this.page.getByTestId('columns-save-button').click()
    }

    get columnConfigSuccess(): Locator {
        return this.page.getByText('Configuração salva com sucesso')
    }

    async removeDataSource() {
        await this.page.getByTestId('data-source-remove-button').click()
    }

    get dataSourceRemovedSuccess(): Locator {
        return this.page.getByText('Fonte de dados removida com sucesso')
    }

    // --- Variable mapping ---

    // Maps the variable (testId suffix `mapping-select-*`) to a column.
    async mapVariable(variableSuffix: string, columnOptionName: string) {
        await this.page.getByTestId(`mapping-select-${variableSuffix}`).click()
        await this.page.getByRole('option', { name: columnOptionName }).click()
    }

    async saveMapping() {
        await this.page.getByTestId('mapping-save-button').click()
    }

    get mappingSuccess(): Locator {
        return this.page.getByText('Mapeamento salvo com sucesso')
    }

    // --- Generation ---

    async generate() {
        await this.page.getByTestId('generate-certificates-button').click()
    }

    get generatingMessage(): Locator {
        return this.page.getByText('Gerando certificados...')
    }

    get generationFinished(): Locator {
        return this.page.getByText('A geração de certificados finalizou')
    }

    // --- Email sending ---

    async sendEmail() {
        await this.page.getByTestId('email-send-button').click()
    }

    get emailColumnRequiredError(): Locator {
        return this.page.getByText('A coluna de e-mail é obrigatória')
    }

    get subjectRequiredError(): Locator {
        return this.page.getByText('O assunto é obrigatório')
    }

    get bodyRequiredError(): Locator {
        return this.page.getByText('O corpo do e-mail é obrigatório')
    }

    async selectEmailColumn(optionName: string) {
        await this.page.getByTestId('email-column-select').click()
        await this.page.getByRole('option', { name: optionName }).click()
    }

    async fillSubject(text: string) {
        await this.page.locator('#email-subject-now').fill(text)
    }

    private get bodyEditor(): Locator {
        return this.page
            .getByTestId('email-body-editor')
            .locator('[contenteditable="true"]')
    }

    // Types into the email body (appends to the current content).
    async typeBody(text: string) {
        await this.bodyEditor.click()
        await this.page.keyboard.type(text)
    }

    // Replaces the entire email body with the given text.
    async replaceBody(text: string) {
        await this.bodyEditor.click()
        await this.page.keyboard.press('Control+a')
        await this.page.keyboard.type(text)
    }

    get subjectMaxError(): Locator {
        return this.page.getByText('Máximo de 255 caracteres ultrapassado')
    }

    get bodyMaxError(): Locator {
        return this.page.getByText('Máximo de 800 caracteres ultrapassado')
    }

    get emailSentSuccess(): Locator {
        return this.page
            .getByTestId('toaster')
            .getByText('Emails enviados com sucesso')
    }
}
