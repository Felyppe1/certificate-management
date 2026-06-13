# Testes E2E

## O que testar

- Fluxos completos do usuário navegando na aplicação real em browser
- Autenticação via banco (cookie de sessão injetado diretamente pelo Prisma)

## O que NÃO testar

- Regras de negócio isoladas — isso é responsabilidade dos unitários

## Configuração

Arquivo: `playwright.config.ts`

- Test dir: `src/tests/e2e/`
- Base URL: `http://localhost:3001`
- `fullyParallel: true` — todos os testes (inclusive dentro do mesmo arquivo) rodam em paralelo entre workers
- Workers: `undefined` local (Playwright decide), `2` no CI
- Retries: 2 no CI, 0 local
- Browsers: Chromium, Firefox, WebKit e Edge — cada caso de teste roda nos 4 browsers em paralelo
- O webserver é iniciado automaticamente por `src/tests/e2e/start-server.ts`:
  - Sobe container PostgreSQL na porta 54332
  - Roda `prisma db push`
  - Builda e sobe Next.js em modo produção na porta 3001

O paralelismo é seguro porque cada teste cria seus próprios dados com IDs únicos (`createId()` do `@paralleldrive/cuid2`) e dados falsos via `faker`, sem compartilhar estado com outros testes. Ao final, cada teste deleta o próprio usuário — o `onDelete: Cascade` do schema limpa sessões e certificados em cascata.

Rodar: `npm run test:e2e` | com UI: `npm run test:e2e:ui`

## Fixtures

`src/tests/e2e/fixtures.ts` estende o `test` do Playwright com a fixture `prisma` (automática, disponível em todos os testes sem declarar), que fornece um cliente Prisma conectado ao banco de testes.

## Helpers

`src/tests/e2e/helpers.ts` centraliza a preparação de estado que se repete entre testes:

| Helper | O que faz |
|--------|-----------|
| `setupAuth(prisma, context, password?)` | Cria usuário e sessão no banco, injeta cookie de sessão no contexto do browser e oculta a tooltip de dicas via `localStorage`. Retorna `{ userId, email, name }`. |
| `setupCertificate(prisma, context)` | Chama `setupAuth` e cria uma emissão de certificado. Retorna `{ userId, emissionId }`. |
| `uploadTemplate(page)` | Navega pelo fluxo de upload de template e aguarda confirmação de sucesso. |
| `uploadDataSource(page)` | Navega pelo fluxo de upload de fonte de dados e aguarda confirmação de sucesso. |

A ocultação de dicas (`TIPS_STORAGE_KEY` no `localStorage`) é feita via `context.addInitScript` dentro de `setupAuth` — garantida antes de qualquer navegação, para que popups de onboarding não interfiram nas asserções.

## Simulação de callbacks assíncronos

Alguns fluxos dependem de webhooks externos (geração de PDFs, envio de e-mails). Nesses casos, o próprio teste dispara a callback via `page.request.fetch` para os endpoints internos, simulando o retorno do Cloud Function:

```ts
for (const row of rows) {
    await page.request.fetch(`/api/internal/data-source-rows/${row.id}/generations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        data: { success: true, totalBytes: 1024, userId },
    })
}
```

## Testes com env vars obrigatórias

Alguns testes dependem de recursos externos (URLs de templates/fontes de dados em nuvem). Eles lançam erro explícito quando a env var está ausente — não são pulados silenciosamente:

```ts
if (!TEMPLATE_URL)
    throw new Error('E2E_TEMPLATE_URL env var is required to run this test')
```

## Localização

```
src/tests/e2e/
├── fixtures.ts
├── helpers.ts
├── start-server.ts
├── fixtures/
│   ├── template.docx
│   └── data-source.csv
├── authentication.e2e.test.ts
├── account-management.e2e.test.ts
└── certificate-emission.e2e.test.ts
```

---

## Exemplo

### Fluxo de browser

```ts
// src/tests/e2e/certificate-emission.e2e.test.ts
import { test, expect } from './fixtures'
import { faker } from '@faker-js/faker'
import { setupAuth } from './helpers'

test.describe('Emissão de certificado', () => {
    test('CRUD - deve criar, renomear, listar e excluir uma emissão de certificado', async ({
        page,
        context,
        prisma,
    }) => {
        const { userId } = await setupAuth(prisma, context)

        const initialName = faker.commerce.productName()
        const renamedName = `${initialName} Renammed`

        await page.goto('/')
        await page.getByTestId('create-emission-button').click()
        await page.getByLabel('Nome da emissão').fill(initialName)
        await page.getByTestId('create-emission-submit').click()
        await page.waitForURL(/\/certificados\/.+/)

        await page.getByTestId('certificate-edit-name-button').click()
        await page.getByRole('textbox').fill(renamedName)
        await page.getByRole('textbox').press('Enter')
        await expect(page.getByText('Nome atualizado com sucesso')).toBeVisible(
            { timeout: 20000 },
        )

        await prisma.user.delete({ where: { id: userId } })
    })
})
```
