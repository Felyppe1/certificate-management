import { env } from '@/env'

export const from = 'nao-responda@mail.certifica.felyppe.com.br'
export const subject = 'Verifique seu e-mail no Certifica'

export function buildHtml(code: string): string {
    return template
        .replaceAll('{{APP_URL}}', env.NEXT_PUBLIC_BASE_URL)
        .replace('{{CODE}}', code)
}

const template = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificação de E-mail - Certifica</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-spacing: 0; border-collapse: collapse; }
        td { padding: 0; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #0d1117; padding-bottom: 2.5rem; padding-top: 2.5rem; }
        .main { background-color: #1a1d24; margin: 0 auto; width: 100%; max-width: 37.5rem; border-radius: 0.75rem; border: 0.0625rem solid #2d3342; overflow: hidden; color: #e6edf3; }
        .header { padding: 2rem 2rem 1.25rem 2rem; text-align: center; }
        .header img { width: 10rem; height: auto; vertical-align: middle; }
        .content { padding: 0 2rem 2rem 2rem; text-align: center; }
        .content h1 { font-size: 1.375rem; margin-bottom: 1rem; color: #ffffff; font-weight: 600; }
        .content p { font-size: 1rem; line-height: 1.5; color: #9ca3af; margin-bottom: 1.5rem; }
        .code-box { display: inline-block; background-color: #0d1117; border: 0.0625rem solid #2d3342; border-radius: 0.5rem; padding: 1rem 2rem; margin-bottom: 1.5rem; }
        .code { font-size: 2.5rem; font-weight: 700; letter-spacing: 0.5rem; color: #ffffff; font-family: monospace; }
        .note { font-size: 0.875rem; color: #6b7280; margin-top: 0; }
        .footer { background-color: #16181d; padding: 1.5rem 2rem; text-align: center; border-top: 0.0625rem solid #2d3342; font-size: 0.875rem; color: #8b949e; }
        .footer p { margin: 0 0 0.25rem 0; }
        .footer a { color: #005bcd; text-decoration: none; }
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
                    <h1>Verifique seu e-mail</h1>
                    <p>Use o código abaixo para confirmar seu endereço de e-mail na plataforma <strong>Certifica</strong>.</p>
                    <div class="code-box">
                        <div class="code">{{CODE}}</div>
                    </div>
                    <p class="note">Este código expira em 15 minutos. Se você não solicitou isso, pode ignorar este e-mail.</p>
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
