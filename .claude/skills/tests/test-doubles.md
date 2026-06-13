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

## Mock

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

## Fake

Implementação funcional simplificada — mais rica que um stub mas sem a complexidade da implementação real. No projeto, os testes de integração usam o Prisma real com banco containerizado no lugar de fakes.

## Spy

Envolve uma implementação real para observar chamadas sem substituí-la. Disponível via `vi.spyOn()` mas não utilizado atualmente no projeto.

---

# Fábricas de Dados de Teste

## Helper factories (unitários e integração)

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

O spread `...overrides` no final garante que qualquer atributo pode ser sobrescrito sem precisar listar cada um explicitamente.

## Faker (e2e)

Para dados realistas em fluxos de browser onde valores fixos causariam colisões:

```ts
import { faker } from '@faker-js/faker'

const initialName = faker.commerce.productName()
```
