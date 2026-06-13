# Visão Geral

| Nível | Framework | Sufixo | Localização |
|-------|-----------|--------|-------------|
| Unitário | Vitest | `.test.ts` | Colocado ao lado do arquivo testado |
| Integração | Vitest | `.integration.test.ts` | Colocado ao lado do arquivo testado |
| E2E | Playwright | `.e2e.test.ts` | `src/tests/e2e/` |

---

# Convenções

## Linguagem e nomenclatura

Todos os testes — unitários, integração e e2e — são escritos em português. O nome do teste descreve a regra ou comportamento esperado, não o que o código faz internamente.

```ts
// correto — fala o que o negócio espera
it('deve impedir envio quando existir destinatário inválido na lista', ...)
test('deve criar conta, verificar e-mail e ficar autenticado', ...)

// errado — descreve implementação ou usa inglês
it('should return false when validateEmailColumnRecords receives invalid email', ...)
test('should create account and verify email', ...)
```

`describe` / `test.describe` aninhados para agrupar cenários pelo mesmo conceito de domínio:

```ts
// Unitários/integração (Vitest)
describe('Email Domain', () => {
    describe('Validação de destinatários', () => { ... })
    describe('Regras obrigatórias para criação', () => { ... })
})

// E2E (Playwright)
test.describe('Autenticação', () => {
    test('deve criar conta, verificar e-mail e ficar autenticado', ...)
    test('deve exibir erro com senha inválida e permitir redefinição de senha', ...)
})
```

## Estrutura para entidades de domínio

Testes de criação de entidade seguem esta hierarquia fixa:

```ts
describe('NomeDaEntidade', () => {
    describe('Criação', () => {
        it('deve criar com sucesso com dados válidos', () => { ... })

        describe('Regras de validação para criação', () => {
            it('deve lançar erro quando o nome for vazio', () => { ... })
            it('deve lançar erro quando o nome exceder 100 caracteres', () => { ... })
        })
    })
})
```

## Múltiplos valores permitidos

Quando um campo aceita um conjunto fixo de valores válidos (ex.: enums, status), usar um `describe` com `it.each` para que cada valor apareça como linha separada no output:

```ts
describe('deve permitir os status', () => {
    it.each(['DRAFT', 'EMITTED', 'CANCELLED'])('%s', (status) => {
        expect(() => new CertificateEmission({ status })).not.toThrow()
    })
})
```

Output:
```
deve permitir os status
  ✓ DRAFT
  ✓ EMITTED
  ✓ CANCELLED
```

## Cobertura de fronteiras (obrigatório em todos os níveis)

Para qualquer campo com restrição de valor (tamanho, range, contagem), sempre teste os vizinhos imediatos das fronteiras. Veja `functional.md` para as técnicas de derivação (particionamento + AVL).

Os casos de fronteira são agrupados em dois `describe` — um para valores válidos e um para inválidos, cada um com 3 testes cobrindo abaixo, exato e acima do limite:

```ts
// Exemplo: nome com mínimo de 3 e máximo de 100 caracteres
describe('Criação', () => {
    describe('deve criar com nome válido', () => {
        it('3 caracteres (limite mínimo)', () => { ... })
        it('caracteres dentro do intervalo', () => { ... })
        it('100 caracteres (limite máximo)', () => { ... })
    })

    describe('deve lançar erro com nome inválido', () => {
        it('2 caracteres (abaixo do mínimo)', () => { ... })
        it('101 caracteres (acima do máximo)', () => { ... })
    })
})
```

## Dublês e dependências

- `Pick<IInterface, 'method'>` em vez de implementar a interface inteira nos dublês
- Caminhos de erro que não chegam em certas dependências usam `{} as IType` (dummy explícito)
- Não mockar o banco nos testes de integração — a distinção entre unitário e integração existe justamente para isso
