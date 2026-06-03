import { env } from '@/env'

export const from = 'nao-responda@mail.certifica.felyppe.com.br'
export const subject = 'Acesso ao Certifica Concedido'

export function buildHtml(): string {
    return template.replaceAll('{{APP_URL}}', env.NEXT_PUBLIC_BASE_URL)
}

export function buildHtmlRealCase(): string {
    return templateRealCase
        .replaceAll('{{APP_URL}}', env.NEXT_PUBLIC_BASE_URL)
        .replaceAll('{{DRIVE_LINK}}', env.DRIVE_LINK ?? '#')
}

export function buildHtmlSimulation(): string {
    return templateSimulation
        .replaceAll('{{APP_URL}}', env.NEXT_PUBLIC_BASE_URL)
        .replaceAll('{{DRIVE_LINK}}', env.DRIVE_LINK ?? '#')
}

const template = `<!DOCTYPE html>
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
        .content p { font-size: 1rem; line-height: 1.5; color: #9ca3af; }
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
                    <p>Olá, tudo bem?<br>Seu acesso à plataforma <strong>Certifica</strong> foi concedido com sucesso. Agora você já pode gerenciar e emitir seus certificados.</p>
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

const extraStyles = `
    body { margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-spacing: 0; border-collapse: collapse; }
    td { padding: 0; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #0d1117; padding-bottom: 2.5rem; padding-top: 2.5rem; }
    .main { background-color: #1a1d24; margin: 0 auto; width: 100%; max-width: 37.5rem; border-radius: 0.75rem; border: 0.0625rem solid #2d3342; overflow: hidden; color: #e6edf3; }
    .header { padding: 2rem 2rem 1.25rem 2rem; text-align: center; }
    .header img { width: 10rem; height: auto; vertical-align: middle; }
    .content { padding: 0 2rem 2rem 2rem; text-align: center; }
    .content h1 { font-size: 1.375rem; margin-bottom: 1rem; color: #ffffff; font-weight: 600; }
    .content p { font-size: 1rem; line-height: 1.5; color: #9ca3af; }
    .button { background-color: #005bcd; color: #ffffff; text-decoration: none; padding: 0.625rem 1.75rem; border-radius: 2rem; font-size: 1rem; font-weight: 600; display: inline-block; }
    .button:hover { background-color: #0050b3; }
    .extra { padding: 0 2rem 2rem 2rem; text-align: left; border-top: 0.0625rem solid #2d3342; }
    .extra h2 { font-size: 1rem; font-weight: 600; color: #e6edf3; margin: 1.25rem 0 0.75rem 0; }
    .extra > p { font-size: 0.9375rem; color: #9ca3af; line-height: 1.6; margin-bottom: 0.75rem; }
    .step-list { margin: 0 0 1.5rem 0; padding: 0; list-style: none; counter-reset: step; }
    .step-list li { font-size: 0.9375rem; line-height: 1.6; color: #9ca3af; margin-bottom: 0.75rem; padding-left: 1.5rem; position: relative; }
    .step-list li::before { content: counter(step); counter-increment: step; position: absolute; left: 0; top: 0; font-weight: 700; color: #005bcd; }
    .bullet-list { margin: 0 0 1.5rem 0; padding: 0; list-style: none; }
    .bullet-list li { font-size: 0.9375rem; line-height: 1.6; color: #9ca3af; margin-bottom: 0.75rem; padding-left: 1.25rem; position: relative; }
    .bullet-list li::before { content: "•"; position: absolute; left: 0; color: #005bcd; }
    .notice { background-color: #0d1117; border-left: 0.25rem solid #005bcd; border-radius: 0 0.375rem 0.375rem 0; padding: 0.75rem 1rem; margin-bottom: 0; font-size: 0.9375rem; color: #9ca3af; line-height: 1.6; }
    .notice strong { color: #e6edf3; }
    .footer { background-color: #16181d; padding: 1.5rem 2rem; text-align: center; border-top: 0.0625rem solid #2d3342; font-size: 0.875rem; color: #8b949e; }
    .footer p { font-size: 0.875rem; line-height: 1.5; color: #8b949e; margin: 0 0 0.25rem 0; }
    .footer a { color: #005bcd; text-decoration: none; }
    .footer a:visited { color: #005bcd; }
    .footer a:hover { text-decoration: underline; }
    a { color: #005bcd; }
`

const sharedContent = `
            <tr>
                <td class="content">
                    <h1>Acesso Liberado</h1>
                    <p>Olá, tudo bem?<br>Seu acesso à plataforma <strong>Certifica</strong> foi concedido com sucesso. Agora você já pode gerenciar e emitir seus certificados.</p>
                </td>
            </tr>`

const sharedFooter = `
            <tr>
                <td class="footer">
                    <p>Este email foi enviado pelo <a href="{{APP_URL}}" target="_blank" rel="noopener noreferrer">Certifica</a>.</p>
                    <p>&nbsp; &copy; 2026</p>
                </td>
            </tr>`

const templateRealCase = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Concedido - Certifica</title>
    <style>${extraStyles}</style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <tr>
                <td class="header">
                    <img src="{{APP_URL}}/logo.png" alt="Certifica Logo">
                </td>
            </tr>
            ${sharedContent}
            <tr>
                <td class="extra">
                    <p>Você utilizará o sistema com seus próprios dados.</p>

                    <h2>Como proceder:</h2>
                    <ol class="step-list">
                        <li>Acesse o sistema e utilize o seu próprio template de certificado e o seu próprio arquivo de dados.</li>
                        <li>Gere ou até envie os certificados para os seus destinatários reais.</li>
                    </ol>

                    <p style="color: #6b7280;">Caso queira testar o sistema com um cenário simulado, disponibilizei <a href="{{DRIVE_LINK}}" target="_blank" rel="noopener noreferrer">arquivos de exemplo</a> com um template de certificado e uma planilha de participantes para você explorar.</p>

                    <div class="notice">
                        <strong>Importante:</strong> Após finalizar o processo no sistema, abra o <strong>Formulário 2</strong> para informar o seu feedback.
                    </div>

                    <div style="text-align: center; margin-top: 1.5rem;">
                        <a href="{{APP_URL}}" target="_blank" rel="noopener noreferrer" class="button" style="color: #ffffff; text-decoration: none;">Acessar Plataforma</a>
                    </div>
                </td>
            </tr>
            ${sharedFooter}
        </table>
    </center>
</body>
</html>`

const templateSimulation = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Concedido - Certifica</title>
    <style>${extraStyles}</style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <tr>
                <td class="header">
                    <img src="{{APP_URL}}/logo.png" alt="Certifica Logo">
                </td>
            </tr>
            ${sharedContent}
            <tr>
                <td class="extra">
                    <p>Preparei um cenário de teste para você.</p>

                    <h2>Como proceder:</h2>
                    <ol class="step-list">
                        <li>Use os <a href="{{DRIVE_LINK}}" target="_blank" rel="noopener noreferrer">arquivos de exemplo</a> que preparei para o teste. A pasta contém um template de certificado de participação em um evento de tecnologia e uma planilha de exemplo dos participantes.</li>
                        <li><strong>Dica crucial:</strong> Abra a planilha de exemplo e adicione pelo menos 1 nova linha com um e-mail real de sua propriedade (ou de amigos/colegas). Assim você poderá verificar se o e-mail com o certificado chegou corretamente.</li>
                        <li>Acesse o sistema, gere e envie os certificados para os destinatários.</li>
                    </ol>

                    <h2>Tarefas para o teste:</h2>
                    <p style="color: #6b7280;">O arquivo do template encontra-se estruturado com variáveis e condicionais lógicas que você teria feito em um caso real. Para ter insumos completos para o Formulário 2, realize estas ações na plataforma:</p>
                    <ul class="bullet-list">
                        <li><strong style="color: #e6edf3;">Formatação de Data:</strong> Na planilha, as datas estão no formato <code style="background:#0d1117;padding:1px 4px;border-radius:3px;">AAAA-MM-DD</code>. Modifique a variável de data no template para exibir no formato brasileiro <code style="background:#0d1117;padding:1px 4px;border-radius:3px;">DD/MM/AAAA</code>. Dica: a tela de configuração do certificado exibe uma dica com link para a documentação.</li>
                        <li><strong style="color: #e6edf3;">Tipo das colunas:</strong> A coluna de palestras separa itens com "/". Garanta que o tipo da coluna está definido como lista com o separador correto.</li>
                        <li><strong style="color: #e6edf3;">Visualização:</strong> Baixe ou visualize os certificados gerados no sistema.</li>
                    </ul>

                    <div class="notice">
                        <strong>Importante:</strong> Após finalizar o processo no sistema, abra o <strong>Formulário 2</strong> para informar o seu feedback.
                    </div>

                    <div style="text-align: center; margin-top: 1.5rem;">
                        <a href="{{APP_URL}}" target="_blank" rel="noopener noreferrer" class="button" style="color: #ffffff; text-decoration: none;">Acessar Plataforma</a>
                    </div>
                </td>
            </tr>
            ${sharedFooter}
        </table>
    </center>
</body>
</html>`
