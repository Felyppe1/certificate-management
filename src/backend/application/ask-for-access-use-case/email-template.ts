import { env } from '@/env'

export const to = env.OWNER_EMAIL
export const from = 'nao-responda@mail.certifica.felyppe.com.br'
export const subject = 'Solicitação de acesso ao Certifica'

export function buildHtml(applicantEmail: string): string {
    return `
        <p>Uma nova solicitação de acesso foi recebida.</p>
        <p><strong>Email do solicitante:</strong> ${applicantEmail}</p>
        <p>Acesse o painel de administração para conceder ou negar o acesso.</p>
        <p><a href="https://console.cloud.google.com/auth/audience?project=${env.GCP_PROJECT_ID}" target="_blank" rel="noopener noreferrer">Acessar Painel de Administração</a></p>
    `
}
