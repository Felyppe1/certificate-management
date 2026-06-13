# Testes de Integração

## O que testar

- Use cases com repositórios Prisma reais contra um banco PostgreSQL de teste
- Verificar que persistência, transações e queries funcionam de ponta a ponta dentro da camada de backend

## O que NÃO testar

- Regras de negócio já cobertas por unitários
- UI ou fluxos de browser

## Configuração

Arquivo: `vitest.config.integration.ts`

- `globalSetup`: `src/tests/global-setup.integration.ts` — sobe container PostgreSQL via Testcontainers e roda `prisma db push`
- `setupFiles`: `src/tests/setup.integration.ts` — inicializa cliente Prisma e trunca tabelas antes de cada teste
- Execução sem paralelismo (`--no-file-parallelism`) para evitar conflitos no banco

Rodar: `npm run test:integration`

## Localização

```
src/backend/application/delete-template-use-case.integration.test.ts
src/backend/application/add-data-source-by-drive-picker-use-case.integration.test.ts (WIP)
```

---

## Exemplo

### Use Case com banco real

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
