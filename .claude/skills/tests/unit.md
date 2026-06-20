# Testes Unitários

## O que testar

- Lógica de negócio pura: entidades, value objects, domain services (`src/backend/domain/`)
- Use cases isolados de dependências externas (`src/backend/application/`)

## O que NÃO testar

- Implementações concretas de repositório (isso é integração)
- Fluxos de UI (isso é e2e)

## Configuração

Arquivo: `vitest.config.unit.ts`

Setup em `src/tests/setup.unit.ts` — define variáveis de ambiente estáticas.

Rodar: `npm run test:unit`

## Localização

```
src/backend/domain/email.test.ts
src/backend/domain/user.test.ts
src/backend/application/delete-template-use-case.test.ts
src/backend/application/login-google-use-case.test.ts
...
```

---

## Exemplos

### Domínio — regra de negócio pura

```ts
// src/backend/domain/product.test.ts
describe('Product Domain', () => {
    describe('Criação', () => {
        it('deve criar produto com sucesso', () => {
            const product = Product.create({ name: 'Camiseta', priceInCents: 4990, stock: 10 })
            expect(product.name).toBe('Camiseta')
            expect(product.priceInCents).toBe(4990)
            expect(product.stock).toBe(10)
        })

        describe('Validações', () => {
            it('deve dar erro quando o nome estiver vazio', () => {
                expect(() => Product.create({ name: '', priceInCents: 4990, stock: 10 }))
                    .toThrow(InvalidProductNameError)
            })
            ...
        })
    })
})
```

### Erros de domínio

Os erros do domínio são classes tipadas organizadas em hierarquia: `AppError` → categoria → erro concreto.

```
src/backend/domain/error/
├── app-error.ts
├── validation-error/
├── not-found-error/
├── forbidden-error/
├── conflict-error/
└── authentication-error/
```

Para assertions use `toThrow(ConcreteError)` — nunca `try/catch`:

```ts
// Síncrono
it('deve dar erro ao tentar mudar para o mesmo email', () => {
    const user = createUserData({ email: 'user@gmail.com', isEmailVerified: true })
    expect(() => user.changeEmail('user@gmail.com')).toThrow(EmailAlreadyVerifiedError)
})

// Assíncrono
it('deve dar erro ao digitar a senha atual errada', async () => {
    const user = createUserData({ passwordHash: await bcrypt.hash('correta', 10) })
    await expect(user.updatePassword('nova', 'errada')).rejects.toThrow(CurrentPasswordIncorrectError)
})
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

### Use Case — caminho feliz (mock + stub)

```ts
// src/backend/application/delete-template-use-case.test.ts
it('deve deletar o template com sucesso', async () => {
    const certificateEmissionsRepositoryMock: Pick<
        ICertificatesRepository,
        'getById' | 'update'
    > = {
        getById: vi.fn().mockResolvedValue(createCertificateEmission()),
        update: vi.fn(),
    }

    const bucketStub: Pick<IBucket, 'deleteObject'> = {
        async deleteObject() {},
    }

    const transactionManagerStub: Pick<ITransactionManager, 'run'> = {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        },
    }

    const useCase = new DeleteTemplateUseCase(
        certificateEmissionsRepositoryMock,
        { resetProcessingStatusByCertificateEmissionId: vi.fn() },
        bucketStub,
        transactionManagerStub,
    )

    await expect(
        useCase.execute({ certificateId: '1', userId: '1' }),
    ).resolves.not.toThrow()

    const updateMock = certificateEmissionsRepositoryMock.update as ReturnType<typeof vi.fn>
    expect(updateMock.mock.calls[0][0].hasTemplate()).toBe(false)
})
```

### Use Case — caminho de erro (dummy)

```ts
it('não deve deletar o template quando o certificado não foi encontrado', async () => {
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
