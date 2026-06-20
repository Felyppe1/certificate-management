# Tipos de Dublê de Teste

O projeto usa dublês nativos do Vitest (`vi.fn()`) e classes inline implementando interfaces. Não há biblioteca de mock/stub externa (sem Sinon, MSW etc.).

## Dummy

Objeto passado como argumento mas nunca utilizado. Usado quando o construtor exige o parâmetro mas o caminho testado não o acessa.

```ts
// O use case lança erro antes de chegar no IBucket ou ITransactionManager
const deleteTemplateUseCase = new DeleteTemplateUseCase(
    certificateEmissionsRepositoryMock,
    {} as IBucket,                   // dummy
    {} as ITransactionManager,       // dummy
)
```

## Stub

Fornece respostas fixas para chamadas. Sem verificação de comportamento. **Use stub sempre que o teste não precisar verificar se o método foi chamado, com quais argumentos ou quantas vezes.** Na dúvida, prefira stub — é mais simples e não contamina outros testes.

```ts
const stringVariableExtractorStub: Pick<IStringVariableExtractor, 'extractVariables'> = {
    extractVariables: () => ['name', 'email'],  // retorno fixo, sem verificar chamadas
}

const transactionManagerStub: Pick<ITransactionManager, 'run'> = {
    async run<T>(work: () => Promise<T>): Promise<T> {
        return work()  // executa o trabalho diretamente, sem transação real
    },
}
```

> **Por que `Pick`?** Implementar apenas os métodos usados pelo teste. Se a interface crescer, os testes existentes não quebram e fica explícito o que cada teste realmente depende.

## Mock

Função ou objeto que verifica se foi chamado, com quais argumentos e quantas vezes. Criado com `vi.fn()`.

**Use mock apenas quando o teste precisar verificar o comportamento de saída** — ou seja, quando o `expect` vai inspecionar se o método foi chamado, quantas vezes, ou com quais argumentos. Se não há nenhum `expect` sobre a chamada, use stub em vez de mock.

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

## Fake

Implementação funcional simplificada — mais rica que um stub mas sem a complexidade da implementação real. No projeto, os testes de integração usam o Prisma real com banco containerizado no lugar de fakes.

## Spy

Envolve uma implementação real para observar chamadas sem substituí-la. Use `vi.spyOn()` quando o teste precisar verificar que um método foi chamado, mas quiser manter a implementação real em vez de substituí-la por um `vi.fn()`.

```ts
const spy = vi.spyOn(user, 'validateResetPasswordCode')

await useCase.execute({ email: 'user@example.com', code: '123456' })

expect(spy).toHaveBeenCalledWith('123456')
```

O retorno pode ser substituído com `.mockResolvedValue()` / `.mockReturnValue()` quando a implementação real não é adequada para o cenário (ex.: `comparePassword` usa bcrypt):

```ts
vi.spyOn(user, 'comparePassword').mockResolvedValue(false)
```

---

# Fábricas de Dados de Teste

## Helper factories (unitários e integração)

Funções que retornam objetos com valores default sensatos e permitem override de **qualquer** atributo:

```ts
function createCertificateEmission(overrides?: Partial<CertificateEmissionInput>) {
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

O spread `...overrides` no final garante que qualquer atributo pode ser sobrescrito sem precisar listar cada um explicitamente.

## Faker (e2e)

Para dados realistas em fluxos de browser onde valores fixos causariam colisões:

```ts
import { faker } from '@faker-js/faker'

const initialName = faker.commerce.productName()
```

## O que declarar no escopo do `describe`

Antes de criar um dublê, conte quantos `it`s do `describe` vão verificar chamadas naquele método (com `expect(...).toHaveBeenCalled()` ou inspecionando `.mock.calls`):

- **Maioria verifica chamadas** → mock no `describe`.
- **Maioria não verifica** → stub no `describe`.
- **Na dúvida** → stub. É mais simples e não carrega estado entre testes.

### Padrão: `let` + `beforeEach`

Declare os dublês com `let` no escopo do `describe` e inicialize-os no `beforeEach` — isso garante um estado limpo a cada `it` sem precisar de `vi.clearAllMocks()`.

- **Mock**: use `Mock<IRepo['método']>` para tipagem precisa sem cast. Inicialize no `beforeEach` com `vi.fn()` e o retorno padrão. Nos `it`s que precisam de retorno diferente, chame o método necessário (`.mockResolvedValue()`, `.mockReturnValue()`, etc.) sobre a função ou, caso precise que o mock volte a ser uma função limpa, chame `.mockReset()` sobre ela — sem recriar o objeto.
- **Stub**: use `Pick<IRepo, 'método'>` como tipo. Inicialize no `beforeEach` com a implementação padrão. Nos `it`s que precisam de comportamento diferente, substitua a função diretamente na propriedade.

```ts
import { Mock } from 'vitest'

let certificatesRepositoryMock: {
    getById: Mock<ICertificatesRepository['getById']>
    update: Mock<ICertificatesRepository['update']>
}

let dataSourceRowsRepositoryStub: Pick<
    IDataSourceRowsRepository,
    'getColumnValuesByCertificateEmissionId' | 'resetProcessingStatusByCertificateEmissionId'
>

beforeEach(() => {
    certificatesRepositoryMock = {
        getById: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
    }

    dataSourceRowsRepositoryStub = {
        async getColumnValuesByCertificateEmissionId() { return [] },
        async resetProcessingStatusByCertificateEmissionId() {},
    }
})

it('caminho feliz', async () => {
    // mock: altera o retorno com .mockResolvedValue()
    certificatesRepositoryMock.getById.mockResolvedValue(createCertificateEmission())

    // ...
    expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(certificateEmission)
})

it('retorna colunas inválidas quando valores incompatíveis', async () => {
    certificatesRepositoryMock.getById.mockResolvedValue(createCertificateEmission())

    // stub: substitui a função diretamente
    dataSourceRowsRepositoryStub.getColumnValuesByCertificateEmissionId =
        async () => ['texto que nao e numero']

    // ...
    expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
})
```
