# Domain-Driven Design

## Layer responsibilities

```
src/backend/
├── domain/          # Entities, aggregates, value objects, events, errors, domain services
├── application/     # Use cases — pure orchestration, no framework dependencies
└── infrastructure/  # Concrete implementations (Prisma, GCP, etc.)
```

## Domain primitives

- `Entity` — has identity (`id: string`), knows nothing about persistence
- `AggregateRoot extends Entity` — registers `DomainEvent[]` via `registerDomainEvent()`; the repository calls `pullDomainEvents()` after saving to consume events
- `ValueObject` — no identity, equality by value
- `DomainEvent` — created inside the aggregate, carries only the minimum needed

## Aggregate pattern

```typescript
export class CertificateEmission extends AggregateRoot {
  private attribute: string
  
  private constructor(private input: CertificateEmissionInput) { super(input.id) }

  static create(input: CreateCertificateEmissionInput): CertificateEmission {
    const certificateEmission = new CertificateEmission({ ...input, id: createId() })
    certificateEmission.registerDomainEvent(new CertificateCreatedDomainEvent(certificateEmission.getId()))
    return certificateEmission
  }
}
```

## Use cases

Each business operation is a separate class with a single `execute()` method. Dependencies are injected via constructor using `Pick<IRepository, 'method'>` — only what the use case needs:

```typescript
export class CreateCertificateEmissionUseCase {
  constructor(
    private certificatesRepository: Pick<ICertificatesRepository, 'save'>,
  ) {}

  async execute(input: Input) {
    const certitificateEmission = CertificateEmission.create(input)
    await this.certificatesRepository.save(certitificateEmission)
    return certitificateEmission.getId()
  }
}
```

## Domain services

Used when business logic involves multiple aggregates and belongs to none of them. Example: `DataSourceDomainService` coordinates `CertificateEmission` + `DataSourceRow[]` creation.

## Domain errors

Always use the typed classes in `src/backend/domain/error/`:
- `AuthenticationError` → 401
- `ForbiddenError` → 403
- `NotFoundError` → 404
- `ConflictError` → 409
- `ValidationError` → 422

Never throw a generic `Error` from inside the domain or application layer.

## Repositories

Interfaces live in `src/backend/application/interfaces/repository/`. Use cases depend on the interface, not the implementation. Prisma implementations live in `src/backend/infrastructure/repository/`.

## Outbox pattern

Events are registered in the aggregate during mutation and persisted alongside the aggregate in the same transaction. The `PgListener` in `src/backend/infrastructure/listener/` watches PostgreSQL and publishes events to Pub/Sub.
