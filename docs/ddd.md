# Domain-Driven Design

## Camadas

```
src/backend/
├── domain/          # Entidades, agregados, value objects, eventos, erros, domain services
├── application/     # Use cases — orquestração pura, sem dependências de framework
└── infrastructure/  # Implementações concretas (Prisma, GCP, gateways)
```

### Domain

Contém toda a lógica de negócio. Nenhum módulo de framework aqui — sem Prisma, sem Next.js, sem GCP SDKs.

```
src/backend/domain/
├── certificate.ts           # CertificateEmission (aggregate root)
├── template.ts              # Template (value object)
├── data-source.ts           # DataSource (value object)
├── data-source-column.ts    # DataSourceColumn
├── data-source-value.ts     # DataSourceValue
├── email.ts                 # Email
├── user.ts                  # User (aggregate root)
├── session.ts               # Session
├── external-user-account.ts # ExternalUserAccount
├── error/                   # Erros tipados por categoria
└── events/                  # Domain events
```

### Application

Use cases com um único método `execute()`. Dependências injetadas via construtor usando `Pick<IInterface, 'método'>` — apenas o que o use case precisa. Sem dependências de framework.

```
src/backend/application/
├── *.ts                 # Cada arquivo é um use case
└── interfaces/
    ├── repository/      # Interfaces de repositórios
    └── cloud/           # Interfaces de serviços externos (bucket, queue, pubsub…)
```

### Infrastructure

Implementações concretas. Tudo que depende de framework, biblioteca ou serviço externo fica aqui.

```
src/backend/infrastructure/
├── repository/prisma/   # Implementações Prisma dos repositórios
├── repository/redis/    # RedisSessionsRepository
├── gateway/             # Integrações externas (Google, Resend)
├── cloud/gcp/           # GcpBucket, CloudTasksQueue, GcpPubSub…
├── server-actions/      # Entry point das mutações do frontend
├── factory/             # Fábricas de extratores de conteúdo
├── sse/                 # SSE broker in-memory
└── listener/            # PgListener (outbox pattern)
```

---

## Primitivos do domínio

### Entity

Tem identidade (`id: string`). Igualdade por ID. Não conhece persistência.

```typescript
export abstract class Entity {
  constructor(private readonly id: string) {}
  getId() { return this.id }
  equals(entity: Entity) { return this.id === entity.id }
}
```

### AggregateRoot

Estende `Entity`. Registra `DomainEvent[]` internamente via `registerDomainEvent()`. O repositório chama `pullDomainEvents()` após salvar para consumir os eventos.

```typescript
export abstract class AggregateRoot extends Entity {
  private domainEvents: DomainEvent[] = []

  protected registerDomainEvent(event: DomainEvent) {
    this.domainEvents.push(event)
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents
    this.domainEvents = []
    return events
  }
}
```

### ValueObject

Sem identidade. Igualdade por valor. Imutável.

### DomainEvent

Criado dentro do agregado, carrega apenas o mínimo necessário. Exemplos:

- `CertificateCreatedDomainEvent`
- `TemplateSetDomainEvent`
- `DataSourceSetDomainEvent`
- `EmailCreatedDomainEvent`

---

## Padrão de agregado

```typescript
export class CertificateEmission extends AggregateRoot {
  private constructor(private input: CertificateEmissionInput) {
    super(input.id)
  }

  static create(input: CreateCertificateEmissionInput): CertificateEmission {
    const emission = new CertificateEmission({ ...input, id: createId() })
    emission.registerDomainEvent(new CertificateCreatedDomainEvent(emission.getId()))
    return emission
  }
}
```

Regras:
- Construtor privado — instanciação sempre via factory method estático (`create`, `restore`)
- `create` registra domain events; `restore` (hidratação do banco) não registra
- Atributos privados — estado exposto somente via getters ou métodos de domínio

---

## Use cases

```typescript
export class CreateCertificateEmissionUseCase {
  constructor(
    private certificatesRepository: Pick<ICertificatesRepository, 'save'>,
  ) {}

  async execute(input: Input) {
    const emission = CertificateEmission.create(input)
    await this.certificatesRepository.save(emission)
    return emission.getId()
  }
}
```

Regras:
- Uma classe, um método `execute()`
- Depende de interfaces, nunca de implementações
- Use `Pick<IRepo, 'method'>` para declarar apenas o que é usado
- Sem lógica de negócio — delega ao domínio
- Sem dependências de framework

---

## Domain services

Usados quando a lógica de negócio envolve múltiplos agregados e não pertence a nenhum deles.

- `DataSourceDomainService` — coordena `CertificateEmission` + criação de `DataSourceRow[]`
- `DataSourceRowDomainService` — lógica de processamento de linhas

---

## Domain errors

Sempre use as classes tipadas em `src/backend/domain/error/`. Nunca lance `Error` genérico na camada de domínio ou aplicação.

| Classe                    | HTTP | Quando usar |
|---------------------------|------|-------------|
| `AuthenticationError`     | 401  | Sessão inválida, expirada, ausente |
| `ForbiddenError`          | 403  | Usuário não tem permissão sobre o recurso |
| `NotFoundError`           | 404  | Recurso não encontrado |
| `ConflictError`           | 409  | Estado conflitante (ex.: geração já em andamento) |
| `ValidationError`         | 422  | Violação de regra de negócio |
| `ServiceUnavailableError` | 503  | Serviço externo indisponível |

Exemplos de tipos de `AuthenticationError`:

```typescript
type AuthenticationErrorType =
  | 'missing-session'
  | 'session-not-found'
  | 'session-expired'
  | 'insufficient-external-account-scopes'
  | 'invalid-service-token'
```

Exemplos de tipos de `ValidationError` (enum `VALIDATION_ERROR_TYPE`):

```typescript
INSUFFICIENT_CREDITS = 'insufficient-credits'
DATA_SOURCE_ROWS_EXCEEDED = 'data-source-rows-exceeded'
GENERATION_ALREADY_IN_PROGRESS = 'generation-already-in-progress'
CERTIFICATE_NOT_GENERATED = 'certificate-not-generated'
DATA_SOURCE_COLUMN_TYPE_CHANGE_NOT_ALLOWED = 'data-source-column-type-change-not-allowed'
```

---

## Interfaces de dependências externas

Vivem em `src/backend/application/interfaces/`. Use cases dependem das interfaces — nunca das implementações.

### Repositórios (`interfaces/repository/`)

| Interface | Responsabilidade |
|-----------|-----------------|
| `ICertificatesRepository` | save, update, delete, getById, métricas |
| `IDataSourceRowsRepository` | mutações de linhas |
| `IDataSourceRowsReadRepository` | queries de linhas |
| `IUsersRepository` | dados de usuário, débito de créditos |
| `ISessionsRepository` | lifecycle de sessão |
| `IEmailsRepository` | persistência de e-mails |
| `ITransactionManager` | executa bloco em transação |
| `IUnitOfWork` | contexto de transação compartilhado |

### Serviços externos (`interfaces/cloud/`)

| Interface | Responsabilidade |
|-----------|-----------------|
| `IBucket` | upload, download, signed URLs, deleção por prefixo |
| `IQueue` | enfileira geração de PDFs e envio de e-mails |
| `IPubSub` | publica eventos em tópicos |
| `IExternalProcessing` | dispara Cloud Functions/Cloud Run |

### Gateways (`interfaces/`)

| Interface | Responsabilidade |
|-----------|-----------------|
| `IGoogleAuthGateway` | troca de tokens OAuth |
| `IGoogleDriveGateway` | acesso a arquivos do Drive |
| `INotificationGateway` | envio de e-mails transacionais |

---

## Transaction manager

Usa `AsyncLocalStorage` para propagar o contexto de transação sem passar o cliente explicitamente por todas as camadas.

```typescript
// Uso no use case
await transactionManager.run(async (client) => {
  await certificatesRepository.save(emission)   // usa o client do contexto
  await dataSourceRowsRepository.saveMany(rows)
})
```

A implementação (`PrismaTransactionManager`) cria a transação Prisma, injeta no `AsyncLocalStorage` e encerra após o bloco completar.

---

## Outbox pattern

1. O agregado registra um `DomainEvent` internamente ao sofrer mutação
2. O repositório (`PrismaCertificatesRepository`) chama `pullDomainEvents()` após salvar
3. Os eventos são persistidos na tabela `Outbox` na **mesma transação** do agregado
4. O `PgListener` (`src/backend/infrastructure/listener/pg/`) escuta o canal `outbox_changes` via PostgreSQL LISTEN/NOTIFY
5. Ao receber notificação, lê e marca o registro como processado, depois publica no Pub/Sub

Isso garante que nenhum evento seja perdido mesmo que o processo caia após salvar o agregado mas antes de publicar.
