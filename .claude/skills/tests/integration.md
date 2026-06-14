# Testes de Integração

## O que testar

- Use cases com repositórios Prisma reais contra um banco PostgreSQL de teste
- Verificar que persistência, transações e queries funcionam de ponta a ponta dentro da camada de backend
- Focar em cenários que exercitem chamadas ao banco — não replicar fluxos que passam por caminhos do banco já testados por outros casos de integração (ou cobertos em unitários)
- Quando o use case persiste dados, verificar que **todos os campos** foram salvos corretamente no banco
- Quando o use case **retorna** dados (leitura), verificar que **todos os campos** do objeto retornado estão mapeados corretamente com os valores persistidos no banco — não apenas um subconjunto

## O que NÃO testar

- Regras de negócio já cobertas por unitários
- UI ou fluxos de browser
- Caminhos que não adicionam cobertura nova de banco (combinações de cenários que já foram exercitadas em outros testes de integração)

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

---

## Teste de rollback de transação

Use cases que realizam múltiplas escritas no banco dentro de uma transação precisam de um caso de teste que verifica que uma falha na última operação reverte todas as anteriores. Isso garante que as operações estão corretamente agrupadas — não espalhadas fora do bloco transacional.

### Quando adicionar

Sempre que o use case executar mais de uma operação de escrita no banco dentro de uma transação.

### Padrão: stub de delegação que falha na última operação

Crie um stub que envolve o repositório real, delegando todas as chamadas exceto a última operação da transação, que lança um erro:

```ts
class CertificatesRepositoryThrowingOnUpdate {
    constructor(private readonly real: PrismaCertificatesRepository) {}

    async getById(id: string) {
        return this.real.getById(id)
    }

    async update(): Promise<void> {
        throw new Error('database failure')
    }
}
```

O stub usa o repositório Prisma real em todas as operações anteriores — só a última é substituída pelo throw. Isso garante que as operações anteriores de fato rodaram no banco antes do rollback. Não é necessário `implements Pick<...>` — TypeScript aceita por compatibilidade estrutural.

### O que assertar

Verificar que o banco está no mesmo estado de antes da execução — as operações que rodaram antes do erro devem ter sido revertidas.

