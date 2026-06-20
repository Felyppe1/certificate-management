---
name: tests
description: Guia para escrever e organizar testes neste projeto (unitários, integração, e2e). Use ao criar novos testes, escolher o tipo de dublê correto, ou decidir onde um teste deve ficar.
---

# Visão Geral

| Nível | Framework | Sufixo | Localização | Especificação |
|-------|-----------|--------|-------------|---------------|
| Unitário | Vitest | `.test.ts` | Colocado ao lado do arquivo testado | [unit.md](unit.md), [test-doubles.md](test-doubles.md) |
| Integração | Vitest | `.integration.test.ts` | Colocado ao lado do arquivo testado | [integration.md](integration.md), [test-doubles.md](test-doubles.md) |
| E2E | Playwright | `.e2e.test.ts` | `src/tests/e2e/` | [e2e.md](e2e.md) |

---

# Convenções

## Linguagem e nomenclatura

As descrições dos casos de teste (`it`, `describe`) são escritas em português. Todo o restante — variáveis, constantes, parâmetros, dados de teste — permanece em inglês. O nome do teste descreve a regra ou comportamento esperado do ponto de vista do usuário/domínio, não o que o código faz internamente. Nunca mencionar nomes de classes, métodos ou tipos de erro de implementação nas descrições.

```ts
// correto — fala o que o negócio espera
it('deve impedir envio quando existir destinatário inválido na lista', ...)
it('deve falhar quando já existe uma conta com esse e-mail', ...)
it('deve retornar a sugestão de vínculo de e-mail quando existe usuário de sistema com mesmo e-mail', ...)

// errado — descreve implementação, menciona tipos técnicos ou usa inglês
it('should return false when validateEmailColumnRecords receives invalid email', ...)
it('deve lançar UserAlreadyExistsError quando usuário já existe', ...)
it('deve retornar suggestLinkingEmail quando existe usuário de sistema com mesmo e-mail', ...)
```

`describe` / `test.describe` aninhados para agrupar cenários pelo mesmo conceito de domínio:

```ts
// Unitários/integração (Vitest)
describe('LoginUseCase', () => {
    describe('fluxo de login com usuário de sistema', () => { ... })
    describe('fluxo de login sem usuário de sistema', () => { ... })
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
describe('deve permitir os tipos de arquivo', () => {
    it.each(['pdf', 'docx', 'pptx'])('%s', (fileExtension) => {
        expect(() => new Template({ fileExtension })).not.toThrow()
    })
})
```

Output:
```
deve permitir os tipos de arquivo
  ✓ pdf
  ✓ docx
  ✓ pptx
```

## Cobertura de fronteiras (obrigatório em todos os níveis)

Para qualquer campo com restrição de valor (tamanho, range, contagem), sempre teste os vizinhos imediatos das fronteiras. Veja a seção de técnicas funcionais abaixo para as técnicas de derivação (particionamento + AVL).

Os casos de fronteira são agrupados em dois `describe` — um para valores válidos e um para inválidos:

```ts
// Exemplo: nome com mínimo de 3 e máximo de 100 caracteres
describe('Criação', () => {
    describe('deve criar com nome válido', () => {
        it('3 caracteres (limite mínimo)', () => { ... })
        it('4 caracteres (acima do limite mínimo)', () => { ... })
        it('99 caracteres (abaixo do limite máximo)', () => { ... })
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
