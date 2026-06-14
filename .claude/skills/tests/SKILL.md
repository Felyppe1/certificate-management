---
name: tests
description: Guia para escrever e organizar testes neste projeto (unitários, integração, e2e). Use ao criar novos testes, escolher o tipo de dublê correto, ou decidir onde um teste deve ficar.
---

# Visão Geral

| Nível | Framework | Sufixo | Localização |
|-------|-----------|--------|-------------|
| Unitário | Vitest | `.test.ts` | Colocado ao lado do arquivo testado |
| Integração | Vitest | `.integration.test.ts` | Colocado ao lado do arquivo testado |
| E2E | Playwright | `.e2e.test.ts` | `src/tests/e2e/` |

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

Os casos de fronteira são agrupados em dois `describe` — um para valores válidos e um para inválidos, cada um com 3 testes cobrindo abaixo, exato e acima do limite:

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

---

# Técnicas de Derivação de Casos de Teste

Deriva casos de teste a partir dos **requisitos**, sem olhar o código. O objetivo é verificar se o sistema se comporta corretamente sob a perspectiva do usuário/domínio.

As técnicas abaixo se aplicam a **todos os níveis de teste** — unitário, integração e e2e.

## Particionamento em Classes de Equivalência

Divide o domínio de entrada em grupos (classes) de valores com mesmo comportamento esperado. Se um valor de uma classe funciona, todos os valores dela funcionam — logo, basta um representante por classe.

**Exemplo 1 — campo "idade" (18–65 anos)**

| Classe | Valores | Tipo |
|--------|---------|------|
| C1 | idade < 18 | Inválida |
| C2 | 18 ≤ idade ≤ 65 | Válida |
| C3 | idade > 65 | Inválida |

**Exemplo 2 — múltiplos campos**

| Condição | Classes Válidas | Classes Inválidas |
|----------|----------------|-------------------|
| Tamanho (T) do e-mail | 5 ≤ T ≤ 100 **(1)** | T < 5 **(2)** e T > 100 **(3)** |
| Altura (A) | 0,1 ≤ A ≤ 9,99 **(4)** | A < 0,1 **(5)** e A > 9,99 **(6)** |

Nesse caso, um único teste cobre todas as classes válidas juntas (1 e 4), em vez de um teste por classe.

## Análise do Valor Limite (AVL)

Complementa o particionamento. A maioria dos defeitos ocorre nas **fronteiras** entre classes, então testa-se os valores dos limites e seus vizinhos imediatos.

**Exemplo — campo "idade" (18–65 anos)**

| Fronteira | Valores a testar |
|-----------|-----------------|
| Limite inferior | 17, 18, 19 |
| Limite superior | 64, 65, 66 |

---

# Arquivos por tipo de teste

Leia os arquivos abaixo conforme a tarefa. Todos estão em `.claude/skills/tests/`.

| Tarefa | Arquivos adicionais |
|--------|---------------------|
| Teste unitário | [unit.md](unit.md), [test-doubles.md](test-doubles.md) |
| Teste de integração | [integration.md](integration.md), [test-doubles.md](test-doubles.md) |
| Teste E2E | [e2e.md](e2e.md) |
