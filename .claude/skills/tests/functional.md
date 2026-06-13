# Teste Funcional / Caixa-Preta

Deriva casos de teste a partir dos **requisitos**, sem olhar o código. O objetivo é verificar se o sistema se comporta corretamente sob a perspectiva do usuário/domínio.

As técnicas abaixo se aplicam a **todos os níveis de teste** — unitário, integração e e2e —, não apenas aos testes funcionais em sentido estrito.

---

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

---

## Análise do Valor Limite (AVL)

Complementa o particionamento. A maioria dos defeitos ocorre nas **fronteiras** entre classes, então testa-se os valores dos limites e seus vizinhos imediatos.

**Exemplo — campo "idade" (18–65 anos)**

| Fronteira | Valores a testar |
|-----------|-----------------|
| Limite inferior | 17, 18, 19 |
| Limite superior | 64, 65, 66 |
