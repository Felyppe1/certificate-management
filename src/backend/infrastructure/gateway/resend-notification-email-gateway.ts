import { Resend } from 'resend'
import { INotificationEmailGateway } from '@/backend/application/interfaces/inotification-email-gateway'

const accessGrantedEmailTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Concedido - Certifica</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-spacing: 0; border-collapse: collapse; }
        td { padding: 0; }
        img { border: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #0d1117; padding-bottom: 2.5rem; padding-top: 2.5rem; }
        .main { background-color: #1a1d24; margin: 0 auto; width: 100%; max-width: 37.5rem; border-radius: 0.75rem; border: 0.0625rem solid #2d3342; overflow: hidden; color: #e6edf3; }
        .header { padding: 2rem 2rem 1.25rem 2rem; text-align: center; }
        .header img { width: 10rem; height: auto; vertical-align: middle; }
        .header span { font-size: 1.5rem; font-weight: 600; color: #ffffff; margin-left: 0.25rem; vertical-align: middle; }
        .content { padding: 0 2rem 2rem 2rem; text-align: center; }
        .content h1 { font-size: 1.375rem; margin-bottom: 1rem; color: #ffffff; font-weight: 600; }
        .content p { font-size: 1rem; line-height: 1.5; color: #9ca3af; margin-bottom: 2rem; }
        .button { background-color: #005bcd; color: #ffffff; text-decoration: none; padding: 0.625rem 1.75rem; border-radius: 2rem; font-size: 1rem; font-weight: 600; display: inline-block; }
        .button:hover { background-color: #0050b3; }
        .footer { background-color: #16181d; padding: 1.5rem 2rem; text-align: center; border-top: 0.0625rem solid #2d3342; font-size: 0.875rem; color: #8b949e; }
        .footer-logo-container { margin-bottom: 1rem; }
        .footer-logo-container img { width: 1.5rem; height: 1.5rem; vertical-align: middle; }
        .footer-logo-container span { font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-left: 0.5rem; vertical-align: middle; }
        .footer p { font-size: 0.875rem; line-height: 1.5; color: #8b949e; margin: 0 0 0.25rem 0; }
        .footer a { color: #005bcd; text-decoration: none; }
        .footer a:visited { color: #005bcd; }
        .footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <tr>
                <td class="header">
                    <img src="{{APP_URL}}/logo.png" alt="Certifica Logo">
                </td>
            </tr>
            <tr>
                <td class="content">
                    <h1>Acesso Liberado</h1>
                    <p>Olá, tudo bem?<br>Seu acesso à plataforma <strong>Certifica</strong> foi concedido com sucesso. Agora você já pode gerenciar e emitir seus certificados de forma ágil e segura.</p>
                    <a href="{{APP_URL}}" target="_blank" rel="noopener noreferrer" class="button" style="color: #ffffff; text-decoration: none;">Acessar Plataforma</a>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p>Este email foi enviado pelo <a href="{{APP_URL}}" target="_blank" rel="noopener noreferrer">Certifica</a>.</p>
                    <p>&nbsp; &copy; 2026</p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>`

export class ResendNotificationEmailGateway
    implements INotificationEmailGateway
{
    private resend: Resend

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY)
    }

    async sendAccessRequest(email: string): Promise<void> {
        const ownerEmail = process.env.OWNER_EMAIL!

        await this.resend.emails.send({
            from: 'Certifica <nao-responda@certifica.felyppe.com.br>',
            to: ownerEmail,
            subject: 'Solicitação de acesso ao Certifica',
            html: `
                <p>Uma nova solicitação de acesso foi recebida.</p>
                <p><strong>Email do solicitante:</strong> ${email}</p>
                <p>Acesse o painel de administração para conceder ou negar o acesso.</p>
            `,
        })
    }

    async sendAccessGranted(email: string): Promise<void> {
        const appUrl = process.env.NEXT_PUBLIC_BASE_URL!

        await this.resend.emails.send({
            from: 'Certifica <nao-responda@certifica.felyppe.com.br>',
            to: email,
            subject: 'Acesso ao Certifica Concedido',
            html: accessGrantedEmailTemplate.replaceAll('{{APP_URL}}', appUrl),
        })
    }
}
