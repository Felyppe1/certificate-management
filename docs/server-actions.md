# Server Actions

Entry point para todas as mutações disparadas pelo frontend (formulários, botões de ação). Vivem em `src/backend/infrastructure/server-actions/`.

## Fluxo padrão

```typescript
'use server'

export async function addDataSourceByUploadAction(_: unknown, formData: FormData) {
  // 1. Extrair dados brutos do FormData
  const rawData = {
    certificateId: formData.get('certificateId') as string,
    files: formData.getAll('files') as File[],
  }

  try {
    // 2. Validar sessão (lê cookies do contexto Next.js — sem argumento)
    const { userId } = await validateSessionToken()

    // 3. Validar e tipar o input com Zod
    const parsed = addDataSourceByUploadSchema.parse(rawData)

    // 4. Injeção de dependência manual
    const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
      new GcpBucket(),
      new PrismaCertificatesRepository(prisma),
      new PrismaDataSourceRowsRepository(prisma),
      new SpreadsheetContentExtractorFactory(),
      new PrismaTransactionManager(prisma),
    )

    // 5. Executar use case
    await addDataSourceByUploadUseCase.execute({ userId, ...parsed })
    return { success: true }
  } catch (error: any) {
    // 6. Tratar erro de autenticação: logout + redirect
    if (error instanceof AuthenticationError) {
      await logoutAction()
      redirect(`/entrar?error=${error.type}`)
    }
    // 7. Devolver tipo de erro para o frontend
    return { success: false, errorType: error.type }
  }
}
```

## Regras

**`'use server'` obrigatório** no topo do arquivo. Cada arquivo de server action exporta uma ou mais funções.

**Validação com Zod antes de qualquer coisa.** Todos os schemas ficam em `src/backend/infrastructure/server-actions/schemas/index.ts`. Esses schemas são exclusivos do backend — nunca devem ser importados pelo frontend. O frontend usa seus próprios schemas (definidos junto ao componente ou em `schemas.ts` local à rota).

**`validateSessionToken()` sem argumento** — lê os cookies do contexto Next.js automaticamente. Em route handlers, passe `request` explicitamente.

**AuthenticationError → logout + redirect.** Sessão inválida ou expirada sempre termina com `logoutAction()` + `redirect('/entrar?error=<tipo>')`. Não retorne `{ success: false }` para erros de autenticação. O `?error=` é lido pelo componente `<Toast />` no layout raiz, que exibe o toast apropriado e limpa o parâmetro da URL. Ver [frontend-structure.md](./frontend-structure.md) — seção "Erros de autenticação via URL".

**Shape de retorno obrigatória:**
```typescript
// Sucesso
return { success: true }

// Erro de negócio
return { success: false, errorType: error.type }
```

Nunca lance exceções para o cliente. Nunca retorne mensagens de erro cruas — use `errorType` para que o frontend possa mapear para mensagens localizadas.

**Sem lógica de negócio.** A server action apenas valida, autentica e delega ao use case. Nenhuma regra de domínio deve ser implementada aqui.

**DI manual.** Instancie repositórios, gateways e demais dependências diretamente na server action. Não use containers de IoC.

## Localização dos arquivos

```
src/backend/infrastructure/server-actions/
├── schemas/
│   └── index.ts          ← todos os schemas Zod das server actions
├── add-data-source-by-upload-action.ts
├── add-template-by-upload-action.ts
├── create-certificate-emission-action.ts
├── generate-certificates-action.ts
├── create-email-action.ts
├── update-data-source-columns-action.ts
├── login-google-server-action.ts
└── ...
```
