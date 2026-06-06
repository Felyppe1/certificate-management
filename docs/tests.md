# Testes

## Visão Geral

O projeto usa três níveis de teste com frameworks distintos:

| Nível | Framework | Sufixo | Localização |
|-------|-----------|--------|-------------|
| Unitário | Vitest | `.test.ts` | Colocado ao lado do arquivo testado |
| Integração | Vitest | `.integration.test.ts` | Colocado ao lado do arquivo testado |
| E2E | Playwright | `.e2e.test.ts` | `src/tests/e2e/` |

---

## Testes Unitários

### O que testar

- Lógica de negócio pura: entidades, value objects, domain services (`src/backend/domain/`)
- Use cases isolados de dependências externas (`src/backend/application/`)

### O que NÃO testar

- Implementações concretas de repositório (isso é integração)
- Fluxos de UI (isso é e2e)

### Configuração

Arquivo: `vitest.config.unit.ts`

```ts
// include
'src/**/*.test.ts'

// exclude
'src/**/*.integration.test.ts'
'src/**/*.e2e.test.ts'
```

Setup em `src/tests/setup.unit.ts` — define variáveis de ambiente estáticas (credenciais fictícias de GCP, banco, OAuth).

Rodar: `npm run test:unit`

### Localização

```
src/backend/domain/email.test.ts
src/backend/domain/user.test.ts
src/backend/application/delete-template-use-case.test.ts
src/backend/application/login-google-use-case.test.ts
...
```

---

## Testes de Integração

### O que testar

- Use cases com repositórios Prisma reais contra um banco PostgreSQL de teste
- Verificar que persistência, transações e queries funcionam de ponta a ponta dentro da camada de backend

### O que NÃO testar

- Regras de negócio já cobertas por unitários
- UI ou fluxos de browser

### Configuração

Arquivo: `vitest.config.integration.ts`

- `globalSetup`: `src/tests/global-setup.integration.ts` — sobe container PostgreSQL via Testcontainers e roda `prisma db push`
- `setupFiles`: `src/tests/setup.integration.ts` — inicializa cliente Prisma e trunca tabelas antes de cada teste
- Execução sem paralelismo (`--no-file-parallelism`) para evitar conflitos no banco

Rodar: `npm run test:integration`

### Localização

```
src/backend/application/delete-template-use-case.integration.test.ts
src/backend/application/add-data-source-by-drive-picker-use-case.integration.test.ts (WIP)
```

---

## Testes E2E

### O que testar

- Fluxos completos do usuário navegando na aplicação real em browser
- Autenticação via banco (cookie de sessão injetado diretamente pelo Prisma)

### O que NÃO testar

- Regras de negócio isoladas — isso é responsabilidade dos unitários

### Configuração

Arquivo: `playwright.config.ts`

- Test dir: `src/tests/e2e/`
- Base URL: `http://localhost:3001`
- `fullyParallel: true` — todos os testes (inclusive dentro do mesmo arquivo) rodam em paralelo entre workers
- Workers: `undefined` local (Playwright decide, ~metade dos CPUs), `4` no CI
- Retries: 2 no CI, 0 local
- Browsers: Chromium, Firefox, WebKit e Edge — cada caso de teste roda nos 4 browsers em paralelo
- O webserver é iniciado automaticamente por `src/tests/e2e/start-server.ts`:
  - Sobe container PostgreSQL na porta 54332
  - Roda `prisma db push`
  - Builda e sobe Next.js em modo produção na porta 3001

O paralelismo é seguro porque cada teste cria seus próprios dados com IDs únicos (`createId()` do `@paralleldrive/cuid2`) e dados falsos via `faker`, sem compartilhar estado com outros testes. Ao final, cada teste deleta o próprio usuário — o `onDelete: Cascade` do schema limpa sessões e certificados em cascata.

Rodar: `npm run test:e2e` | com UI: `npm run test:e2e:ui`

### Fixtures

`src/tests/e2e/fixtures.ts` estende o `test` do Playwright com a fixture `prisma`, que fornece um cliente Prisma conectado ao banco de testes. Não há truncate global — o isolamento é garantido pelos IDs únicos por teste.

### Localização

```
src/tests/e2e/
├── fixtures.ts
├── start-server.ts
└── certificate-emission-crud.e2e.test.ts
```

---

## Tipos de Dublê de Teste

O projeto usa dublês nativos do Vitest (`vi.fn()`) e classes inline implementando interfaces. Não há biblioteca de mock/stub externa (sem Sinon, MSW etc.).

### Dummy

Objeto passado como argumento mas nunca utilizado. Usado quando o construtor exige o parâmetro mas o caminho testado não o acessa.

```ts
// O use case lança erro antes de chegar no IBucket ou ITransactionManager
const deleteTemplateUseCase = new DeleteTemplateUseCase(
    certificateEmissionsRepositoryMock,
    {} as IBucket,                   // dummy
    {} as ITransactionManager,       // dummy
)
```

### Stub

Fornece respostas fixas para chamadas. Sem verificação de comportamento.

```ts
class BucketStub implements Pick<IBucket, 'deleteObject'> {
    async deleteObject() {}  // não faz nada, não verifica chamadas
}

class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
    async run<T>(work: () => Promise<T>): Promise<T> {
        return work()  // executa o trabalho diretamente, sem transação real
    }
}
```

> **Por que `Pick`?** Implementar apenas os métodos usados pelo teste. Se a interface crescer, os testes existentes não quebram e fica explícito o que cada teste realmente depende.

### Mock

Função ou objeto que verifica se foi chamado, com quais argumentos e quantas vezes. Criado com `vi.fn()`.

```ts
const certificateEmissionsRepositoryMock: Pick<
    ICertificatesRepository,
    'getById' | 'update'
> = {
    getById: vi.fn().mockResolvedValue(createCertificateEmission()),
    update: vi.fn(),
}

// Verificação de comportamento
expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()

// Inspecionar argumentos da chamada
const updateMock = certificateEmissionsRepositoryMock.update as ReturnType<typeof vi.fn>
const updatedCertificate = updateMock.mock.calls[0][0] as CertificateEmission
expect(updatedCertificate.hasTemplate()).toBe(false)
```

### Fake

Implementação funcional simplificada — mais rica que um stub mas sem a complexidade da implementação real. No projeto, os testes de integração usam o Prisma real com banco containerizado no lugar de fakes.

### Spy

Envolve uma implementação real para observar chamadas sem substituí-la. Disponível via `vi.spyOn()` mas não utilizado atualmente no projeto.

---

## Fábricas de Dados de Teste

### Helper factories (unitários e integração)

Funções que retornam objetos com valores default sensatos e permitem override de **qualquer** atributo:

```ts
function createCertificateEmission(overrides?: Partial<CertificateEmissionProps>) {
    return new CertificateEmission({
        id: CERTIFICATE_ID,
        name: 'Name',
        userId: USER_ID,
        template: new Template({ ... }),
        createdAt: new Date(),
        status: CERTIFICATE_STATUS.DRAFT,
        dataSource: null,
        variableColumnMapping: null,
        ...overrides,
    })
}

// Uso: só sobrescreve o que importa para o cenário
createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED })
createCertificateEmission({ userId: 'other-user-id' })
createCertificateEmission({ template: null })
```

O spread `...overrides` no final garante que qualquer atributo pode ser sobrescrito sem precisar listar cada um explicitamente. Novos campos adicionados à entidade ficam disponíveis para override automaticamente.

### Faker (e2e)

Para dados realistas em fluxos de browser onde valores fixos causariam colisões:

```ts
import { faker } from '@faker-js/faker'

const initialName = faker.commerce.productName()
```

---

## Exemplos

### Teste Unitário — Domínio (regra de negócio pura)

```ts
// src/backend/domain/email.test.ts
describe('Email Domain', () => {
    describe('Validação de destinatários', () => {
        it('deve permitir envio quando todos os destinatários informados forem válidos', () => {
            const result = Email.validateEmailColumnRecords(['user@email.com'])
            expect(result).toBe(true)
        })

        it('deve impedir envio quando existir destinatário inválido na lista', () => {
            const result = Email.validateEmailColumnRecords(['invalid-email'])
            expect(result).toBe(false)
        })
    })
})
```

### Teste Unitário — Erros de domínio

Os erros do domínio são classes tipadas organizadas em hierarquia: `AppError` → categoria → erro concreto. Isso permite que camadas superiores (server actions, route handlers) tratem erros por tipo sem depender de strings.

```
src/backend/domain/error/
├── app-error.ts
├── validation-error/       # regra de negócio violada
├── not-found-error/        # recurso não encontrado
├── forbidden-error/        # acesso negado
├── conflict-error/         # estado inconsistente / duplicado
└── authentication-error/   # sessão / credenciais inválidas
```

Para assertions use `toThrow(ConcreteError)` — nunca `try/catch`:

```ts
// Síncrono — método que valida invariante
it('deve dar erro ao tentar mudar para o mesmo email', () => {
    const user = createUserData({
        email: 'user@gmail.com',
        passwordHash: 'hash',
        isEmailVerified: true,
    })

    expect(() => user.changeEmail('user@gmail.com')).toThrow(EmailAlreadyVerifiedError)
})

// Assíncrono — método async
it('deve dar erro ao digitar a senha atual errada', async () => {
    const user = createUserData({
        email: 'user@gmail.com',
        passwordHash: await bcrypt.hash('correta', 10),
        isEmailVerified: true,
    })

    await expect(user.updatePassword('nova', 'errada')).rejects.toThrow(CurrentPasswordIncorrectError)
})
```

`toThrow(ConcreteError)` verifica por `instanceof`. Pode-se também checar a categoria quando o teste não depende do erro exato:

```ts
import { ValidationError } from '@/backend/domain/error/validation-error'

expect(() => user.changeEmail('user@gmail.com')).toThrow(ValidationError)
```

**Anti-padrão — `try/catch`**: se a função não lançar, o bloco `catch` nunca executa e o teste passa sem verificar nada.

```ts
// Evitar
try {
    user.removeExternalAccount('GOOGLE')
} catch (error: any) {
    expect(error).toBeInstanceOf(LastLoginMethodError) // nunca roda se não lançar
}
```

---

### Teste Unitário — Use Case (caminho feliz com mock e stub)

```ts
// src/backend/application/delete-template-use-case.test.ts
it('should delete a template successfully', async () => {
    const certificateEmissionsRepositoryMock: Pick<
        ICertificatesRepository,
        'getById' | 'update'
    > = {
        getById: vi.fn().mockResolvedValue(createCertificateEmission()),
        update: vi.fn(),
    }

    class BucketStub implements Pick<IBucket, 'deleteObject'> {
        async deleteObject() {}
    }

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    const useCase = new DeleteTemplateUseCase(
        certificateEmissionsRepositoryMock,
        { resetProcessingStatusByCertificateEmissionId: vi.fn() },
        new BucketStub(),
        new TransactionManagerStub(),
    )

    await expect(
        useCase.execute({ certificateId: '1', userId: '1' }),
    ).resolves.not.toThrow()

    // Verifica efeito via argumento passado ao mock
    const updateMock = certificateEmissionsRepositoryMock.update as ReturnType<typeof vi.fn>
    expect(updateMock.mock.calls[0][0].hasTemplate()).toBe(false)
})
```

### Teste Unitário — Use Case (caminho de erro com dummy)

```ts
it('should not delete a template when the certificate is not found', async () => {
    const repositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
        getById: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
    }

    const useCase = new DeleteTemplateUseCase(
        repositoryMock,
        {} as IDataSourceRowsRepository, // dummy — caminho de erro não chega aqui
        {} as IBucket,
        {} as ITransactionManager,
    )

    await expect(
        useCase.execute({ certificateId: 'nao-existe', userId: '1' }),
    ).rejects.toThrow(CertificateNotFoundError)

    expect(repositoryMock.update).not.toHaveBeenCalled()
})
```

### Teste de Integração — Use Case com banco real

```ts
// src/backend/application/delete-template-use-case.integration.test.ts
it('should delete a template successfully', async () => {
    // Arrange: cria dados diretamente no banco de teste
    await prisma.user.create({ data: { id: '1', email: 'user@gmail.com', ... } })
    await prisma.certificateEmission.create({
        data: { id: '1', ..., Template: { create: { ... } } },
    })

    class BucketStub implements Pick<IBucket, 'deleteObject'> {
        async deleteObject() {}
    }

    // Act: use case com repositórios Prisma reais
    const useCase = new DeleteTemplateUseCase(
        new PrismaCertificatesRepository(prisma),
        new PrismaDataSourceRowsRepository(prisma),
        new BucketStub(),
        new PrismaTransactionManager(prisma),
    )
    await useCase.execute({ certificateId: '1', userId: '1' })

    // Assert: verifica estado no banco
    const template = await prisma.template.findFirst({
        where: { certificate_emission_id: '1' },
    })
    expect(template).toBeNull()
})
```

### Teste E2E — Fluxo de browser

```ts
// src/tests/e2e/certificate-emission-crud.e2e.test.ts
test('should create, rename, verify updated name in listing, delete', async ({
    page,
    context,
    prisma,
}) => {
    // Auth: injeta sessão diretamente no banco e seta cookie
    await setupAuth(prisma, context)

    const name = faker.commerce.productName()

    await page.goto('/')
    await page.getByRole('button', { name: 'Criar' }).first().click()
    await page.getByLabel('Nome da emissão').fill(name)
    await page.getByRole('button', { name: 'Criar Emissão' }).click()
    await page.waitForURL(/\/certificados\/.+/)

    // Rename...
    await page.getByTitle('Editar nome do certificado').click()
    await page.getByRole('textbox').fill(`${name} Renameado`)
    await page.getByRole('textbox').press('Enter')
    await expect(page.getByText('Nome atualizado com sucesso')).toBeVisible()
})
```

---

## Convenções

**Linguagem e nomenclatura**

Testes são escritos na linguagem do negócio, em português. O nome do teste descreve a regra ou comportamento esperado — não o que o código faz internamente.

```ts
// correto — fala o que o negócio espera
it('deve impedir envio quando existir destinatário inválido na lista', ...)

// errado — descreve implementação
it('should return false when validateEmailColumnRecords receives invalid email', ...)
```

`describe` aninhados para agrupar cenários pelo mesmo conceito de domínio:

```ts
describe('Email Domain', () => {
    describe('Validação de destinatários', () => { ... })
    describe('Regras obrigatórias para criação', () => { ... })
})
```

**Dublês e dependências**

- `Pick<IInterface, 'method'>` em vez de implementar a interface inteira nos dublês
- Caminhos de erro que não chegam em certas dependências usam `{} as IType` (dummy explícito)
- Use `beforeEach` + `vi.clearAllMocks()` quando os mocks são compartilhados entre testes
- Não mockar o banco nos testes de integração — a distinção entre unitário e integração existe justamente para isso
