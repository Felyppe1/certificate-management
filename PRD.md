# PRD — Sistema de Emissão de Certificados

## Visão geral

O sistema permite gerar e enviar certificados em massa a partir de um template de documento (que aceita a sintaxe de template **Liquid**) e uma fonte de dados tabular (uma linha = um certificado). O fluxo principal de uso é:

1. O usuário cria uma **Emissão de Certificados**, dando um nome a ela.
2. Define um **Template** (arquivo do tipo apresentação/documento) contendo variáveis Liquid, por upload, por um link público do Google Drive ou selecionando um arquivo do Google Drive.
3. Define uma **Fonte de Dados** (planilha ou, alternativamente, imagens de uma lista manuscrita/impressa que são convertidas em dados tabulares por IA).
4. **Mapeia** cada variável do template para uma coluna da fonte de dados.
5. **Gera** os certificados: um PDF é produzido por linha da fonte de dados, consumindo créditos do usuário.
6. **Envia por e-mail** os certificados gerados para os destinatários indicados por uma coluna de e-mail da fonte de dados.
7. Pode **visualizar, baixar (individualmente ou em lote) e reenviar** certificados antes ou depois do envio.

## 1. Entidades de domínio

### 1.1 Usuário

Representa a conta que utiliza o sistema. Pode autenticar-se por e-mail/senha ("login de sistema"), por Google, ou por ambos simultaneamente.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email` | Texto (opcional) | E-mail de login de sistema. Pode ser nulo se o usuário só usa login Google. |
| `isEmailVerified` | Booleano | Indica se o e-mail de sistema foi confirmado. |
| `name` | Texto | Nome do usuário (3 a 100 caracteres). |
| `passwordHash` | Texto (opcional) | Hash da senha de sistema. Só existe se `email` existir. |
| `credits` | Número | Créditos disponíveis para geração de certificados. Padrão inicial: 300. |
| `externalAccounts` | Lista de Conta Externa | Contas de provedores externos vinculadas (atualmente apenas Google). |

#### Relacionamentos

- Possui uma ou mais **Sessões** ativas.
- Pode ter uma ou mais **Contas Externas** vinculadas (atualmente só tem Google, mas pode ter Facebook, Apple, ...).
- É dono de uma ou mais **Emissões de Certificados**.
- Possui um registro de **Uso Diário** por dia em que gerou certificados ou enviou e-mails.

### 1.2 Sessão

Representa uma sessão de autenticação ativa do usuário no sistema.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `token` | Texto | Identificador opaco da sessão (também é o identificador único). |
| `userId` | ID | Usuário dono da sessão. |
| `expiresAt` | Data | Expira 7 dias após a criação. |

Não há rotação/renovação de sessão nem limite de sessões simultâneas por usuário — cada login, vínculo de conta ou verificação de e-mail bem-sucedidos cria uma nova sessão.

### 1.3 Conta Externa

Representa o vínculo do usuário com um provedor de login externo (hoje, apenas Google).

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `provider` | Enum | Atualmente apenas `GOOGLE`. |
| `email` | Texto | E-mail da conta no provedor. |
| `accessToken` / `refreshToken` | Texto | Tokens OAuth usados para acessar o Google Drive em nome do usuário. |

#### Relacionamentos

- Pertence a um **Usuário**.

### 1.4 Emissão de Certificados

Agregado raiz que representa um lote de certificados a ser gerado e enviado. Reúne um Template, uma Fonte de Dados, o mapeamento entre variáveis do template e colunas da fonte de dados, e (indiretamente, via linhas da fonte de dados e o E-mail) o estado de geração e envio.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | Texto | Nome da emissão (1 a 100 caracteres). Editável a qualquer momento. |
| `status` | Enum | Estado atual (ver ciclo de vida). |
| `userId` | ID | Dono da emissão. |
| `template` | Template (opcional) | Template definido para esta emissão. |
| `dataSource` | Fonte de Dados (opcional) | Fonte de dados definida para esta emissão. |
| `variableColumnMapping` | Mapa Texto→Texto\|nulo | Associação entre cada variável do template e o nome de uma coluna da fonte de dados (ou `null` se ainda não mapeada). |

#### Ciclo de vida

```
DRAFT → GENERATED → EMITTED
  ↓         ↓
  └────→ SCHEDULED (agendamento de envio — ver observação abaixo)
```

- `DRAFT`: estado inicial. Também é o estado para o qual a emissão retorna sempre que template, fonte de dados, mapeamento de variáveis ou colunas/linhas da fonte de dados são alterados (qualquer alteração estrutural invalida a geração anterior e exige regeração).
- `GENERATED`: atingido automaticamente quando todas as linhas da fonte de dados terminam de processar (com sucesso ou falha) após uma geração ou nova geração.
- `SCHEDULED`: atingido quando o usuário agenda o envio de e-mail para uma data futura em vez de enviar imediatamente. **Observação**: o agendamento é reconhecido no domínio e na interface, mas o disparo automático dos e-mails na data agendada ainda não está implementado no backend — atualmente apenas o envio imediato realmente despacha e-mails.
- `EMITTED`: atingido quando o e-mail com os certificados é efetivamente enviado (envio imediato). É um estado final: uma vez `EMITTED`, a emissão não pode mais ter template, fonte de dados, colunas, linhas ou mapeamento alterados, nem ser excluída. A única ação possível é reenviar e-mail para linhas específicas.
- Caso o processo de envio de e-mail falhe na infraestrutura, a emissão retorna de `EMITTED` para `GENERATED` (permitindo nova tentativa de envio).

#### Relacionamentos

- Pertence a um **Usuário** (dono/criador).
- Contém no máximo um **Template**.
- Contém no máximo uma **Fonte de Dados**, que por sua vez contém várias **Linhas da Fonte de Dados**.
- Contém no máximo um **E-mail** (configuração de envio).

### 1.5 Template

Representa o documento-molde usado para gerar os certificados. Aceita variáveis no formato Liquid (ex.: `{{ nome }}`).

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `inputMethod` | Enum | `UPLOAD`, `GOOGLE_DRIVE` ou `URL` — como o arquivo foi fornecido. |
| `fileName` | Texto | Nome do arquivo. |
| `fileMimeType` | Enum | Tipo do arquivo (ver regras). |
| `variables` | Lista de Texto | Nomes das variáveis Liquid detectadas no conteúdo do template. |
| `driveFileId` | Texto (opcional) | Identificador do arquivo no Google Drive, quando aplicável. |
| `googleAccountEmail` | Texto (opcional) | Conta Google usada para acessar o arquivo, quando aplicável. |

#### Relacionamentos

- Pertence a exatamente uma **Emissão de Certificados**.
- Cada variável em `variables` pode estar mapeada, via a emissão, a uma **Coluna da Fonte de Dados**.

### 1.6 Fonte de Dados

Representa a origem tabular de dados que substitui as variáveis do template — uma linha gera um certificado.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `inputMethod` | Enum | `UPLOAD`, `GOOGLE_DRIVE` ou `URL`. |
| `fileMimeType` | Enum | Tipo do(s) arquivo(s) (ver regras). |
| `files` | Lista de arquivo | Um arquivo (planilha) ou até 4 arquivos (imagens). |
| `columns` | Lista de Coluna da Fonte de Dados | Colunas identificadas/definidas na fonte. |
| `columnsRow` / `dataRowStart` | Número | Linha onde estão os cabeçalhos e linha onde começam os dados, na planilha de origem. |
| `googleAccountEmail` | Texto (opcional) | Conta Google usada para acessar o(s) arquivo(s), quando aplicável. |

#### Relacionamentos

- Pertence a exatamente uma **Emissão de Certificados**.
- Possui uma ou mais **Colunas da Fonte de Dados**.
- Possui uma ou mais **Linhas da Fonte de Dados**.

### 1.7 Coluna da Fonte de Dados

Descreve uma coluna da fonte de dados e seu tipo, usado tanto para validar valores quanto para exibição/edição na interface.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | Texto | Nome da coluna. |
| `type` | Enum | `string`, `number`, `boolean`, `date` ou `array`. |
| `arrayMetadata.separator` | Texto (1 a 3 caracteres) | Caractere separador dos itens, obrigatório quando `type` é `array`. |
| `arrayMetadata.itemType` | Enum | Tipo de cada item do array (`string`, `number`, `boolean` ou `date`). |

Ao criar a fonte de dados, o tipo de cada coluna é **inferido automaticamente** a partir dos valores presentes (reconhece booleanos em português/inglês, números em formato BR ou US, datas em formato brasileiro, e detecta arrays por vírgula ou ponto-e-vírgula).

### 1.8 Linha da Fonte de Dados

Representa uma linha da fonte de dados — corresponde a um certificado a ser gerado.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `data` | Mapa Texto→Texto | Valor de cada coluna para esta linha. |
| `processingStatus` | Enum | Estado do processamento de geração do certificado. |
| `fileBytes` | Número (opcional) | Tamanho do PDF gerado, presente apenas quando concluído com sucesso. |
| `sourceRowIndex` | Número | Posição original da linha na fonte de dados. |

#### Ciclo de vida

```
PENDING → RUNNING → COMPLETED
              ↓
            FAILED → RETRYING → COMPLETED
                          ↓
                        FAILED
```

- Toda linha nasce `PENDING`.
- Qualquer edição de colunas ou linhas da fonte de dados, ou do mapeamento de variáveis, reseta todas as linhas de volta para `PENDING` (forçando nova geração).
- Só é possível reprocessar (`RETRYING`) uma linha que esteja `FAILED`.

#### Relacionamentos

- Pertence a exatamente uma **Fonte de Dados** (e, transitivamente, a uma Emissão de Certificados).

### 1.9 E-mail

Representa a configuração de envio dos certificados por e-mail de uma emissão — assunto, corpo, coluna de destinatários e status geral do disparo.

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `subject` | Texto | Assunto do e-mail (até 255 caracteres). |
| `body` | Texto | Corpo do e-mail (até 800 caracteres). |
| `emailColumn` | Texto | Nome da coluna da fonte de dados que contém o e-mail do destinatário. |
| `scheduledAt` | Data (opcional) | Data/hora de agendamento do envio, se aplicável. |
| `status` | Enum | `PENDING`, `RUNNING`, `COMPLETED` ou `FAILED` — status do disparo em lote. |
| `emailErrorType` | Enum (opcional) | Motivo de falha: `DELETED_EMAIL_COLUMN`, `INVALID_EMAILS`, `UNMAPPED_VARIABLES` ou `INTERNAL_ERROR`. |

#### Relacionamentos

- Pertence a exatamente uma **Emissão de Certificados**.
- `emailColumn` referencia uma **Coluna da Fonte de Dados** da mesma emissão.

### 1.10 Uso Diário

Registro agregado, por usuário e por dia, de quantos certificados foram gerados e quantos e-mails foram enviados. Usado exclusivamente para exibir métricas ao usuário — não é um mecanismo de limitação por si só (quem limita é o saldo de créditos, ver regras de negócio).

#### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `date` | Data | Dia de referência. |
| `certificatesGeneratedCount` | Número | Certificados gerados com sucesso naquele dia. |
| `emailsSentCount` | Número | E-mails enviados com sucesso naquele dia. |

#### Relacionamentos

- Pertence a um **Usuário**.

## 2. Relacionamentos (resumo)

- Um **Usuário** possui várias **Emissões de Certificados**, várias **Sessões**, pode ter **Contas Externas** vinculadas e acumula registros de **Uso Diário**.
- Uma **Emissão de Certificados** pertence a um **Usuário**, contém no máximo um **Template**, no máximo uma **Fonte de Dados** e no máximo um **E-mail**, além de manter o mapeamento entre variáveis do Template e colunas da Fonte de Dados.
- Uma **Fonte de Dados** contém várias **Colunas** e várias **Linhas**; cada **Linha** representa um certificado individual e carrega seu próprio status de geração.
- Um **E-mail** referencia uma coluna específica da Fonte de Dados como origem dos endereços de destinatários.

## 3. Regras de negócio

### 3.1 Autenticação e conta

- Um usuário pode ter login de sistema (e-mail/senha), login Google, ou ambos. Não pode existir e-mail de sistema sem senha, nem senha sem e-mail.
- Login por e-mail/senha só é permitido se o e-mail estiver verificado; caso contrário o acesso é bloqueado até a verificação.
- Login via Google não exige verificação adicional de e-mail (a conta Google é tratada como já verificada) e exige que o usuário tenha concedido as permissões de acesso ao Google Drive (`drive.file` e `drive.readonly`) — sem essas permissões, o login/vínculo é recusado.
- Um usuário nunca pode ficar sem nenhuma forma de login: remover uma conta externa só é permitido se restar outra conta externa **ou** se o login de sistema estiver ativo e com e-mail verificado ("proteção do último método de login").
- Vincular uma conta Google a uma conta de sistema já existente com o mesmo e-mail (ou vice-versa) funde as duas contas em um único usuário, preservando créditos e emissões da conta que permanece e excluindo a outra.
- Alteração de e-mail de sistema exige confirmação por código enviado ao novo e-mail; o e-mail só é efetivado após a confirmação, e não pode coincidir com um e-mail já em uso por outro usuário (validado tanto na solicitação quanto na confirmação, para evitar corridas).
- Redefinição de senha exige um código de verificação (enviado por e-mail) válido e não expirado, e só está disponível para contas com login de sistema ativo.
- Sessões expiram em 7 dias e não são renovadas automaticamente; múltiplas sessões simultâneas são permitidas.

### 3.2 Créditos e limites de uso

- Todo usuário novo recebe 300 créditos.
- Gerar certificados consome **1 crédito por linha da fonte de dados**, debitado no momento da geração inicial. Se o saldo for insuficiente para cobrir todas as linhas, a geração inteira é bloqueada (nenhum crédito é debitado parcialmente).
- Repetir a geração apenas das linhas que falharam ("tentar novamente") **não consome créditos adicionais**.
- O envio de e-mails **não consome créditos**.
- Os créditos de todos os usuários são renovados para 300 uma vez por dia (reset completo, não cumulativo — créditos não utilizados não se acumulam para o dia seguinte).

### 3.3 Emissão de certificados — regras gerais

- Só o dono de uma emissão pode visualizá-la, editá-la, gerar, enviar e-mails, baixar certificados ou excluí-la.
- Uma emissão `EMITTED` (e-mails já enviados) não pode mais ter template, fonte de dados, colunas, linhas ou mapeamento de variáveis alterados, e não pode ser excluída.
- Excluir uma emissão remove também os arquivos armazenados de template e fonte de dados.

### 3.4 Template

- Métodos de entrada aceitos: upload de arquivo, seleção via Google Drive, ou link compartilhável do Google Drive.
- Formatos aceitos: PPTX, DOCX, Google Slides e Google Docs. Qualquer outro tipo é rejeitado.
- Tamanho máximo do arquivo: 5MB.
- As variáveis do template são extraídas automaticamente do conteúdo em sintaxe Liquid. São reconhecidas apenas variáveis "externas" (que o template espera receber) — variáveis definidas dentro do próprio template (via `assign` ou variáveis de laço `for`) não entram na lista de variáveis a mapear. Referências a caminhos aninhados (ex. `pessoa.endereco.rua`) são reduzidas ao nome da variável raiz (`pessoa`) para fins de mapeamento.
- Definir ou substituir o template invalida o mapeamento anterior de variáveis (que é recalculado) e faz a emissão voltar para `DRAFT`.
- Templates vindos do Google Drive ou de link podem ser atualizados ("refresh") para buscar a versão mais recente do arquivo; templates enviados por upload local não têm essa opção.
- Nenhuma dessas ações (definir, substituir, remover, atualizar) é permitida em uma emissão já `EMITTED`.

### 3.5 Fonte de dados

- Métodos de entrada aceitos: upload de arquivo, seleção via Google Drive, ou link compartilhável do Google Drive.
- Formatos aceitos: planilhas (CSV, XLSX, ODS, Google Sheets) ou imagens (PNG, JPEG).
- Tamanho máximo do arquivo: 2MB.
- Limites da fonte de dados: no máximo 300 linhas e 20 colunas.
- Para planilhas, é permitido exatamente 1 arquivo. Para imagens, são permitidos até 4 arquivos, e todos os arquivos enviados juntos devem ser imagens (não é permitido misturar planilha com imagem).
- Fontes de dados baseadas em imagem passam por **extração assistida por Inteligência Artificial**: o conteúdo da(s) imagem(ns) — por exemplo, uma lista manuscrita ou impressa de nomes — é interpretado e convertido em linhas e colunas tabulares automaticamente; células ilegíveis viram valor vazio e colunas sem cabeçalho recebem nome automático.
- O tipo de cada coluna é inferido automaticamente a partir dos valores no momento da criação da fonte de dados.
- Fontes de dados baseadas em imagem ou em Google Sheets não podem ser "atualizadas" (refresh) a partir da origem.
- Uma fonte de dados baseada em imagem pode ser **convertida em planilha** (CSV ou XLSX): os dados já extraídos são exportados como planilha real, salva no armazenamento do sistema ou no Google Drive do usuário, e passam a substituir as imagens como fonte de dados.
- Definir ou substituir a fonte de dados recalcula o mapeamento de variáveis e faz a emissão voltar para `DRAFT`.
- Alterar o **tipo de uma coluna** existente segue duas regras:
  - Certas trocas são **proibidas** e sempre bloqueadas: número ↔ booleano, número ↔ data, booleano ↔ data (e suas trocas inversas).
  - Outras trocas são **permitidas mas arriscadas** (ex.: texto → número/booleano/data/array, ou qualquer tipo → array): antes de confirmar, o sistema valida se **todos os valores já existentes** naquela coluna são compatíveis com o novo tipo; se qualquer valor não puder ser convertido, a alteração inteira é rejeitada e as colunas problemáticas são apontadas.
  - Uma alteração de coluna bem-sucedida reseta a emissão para `DRAFT` e todas as linhas voltam a `PENDING` (nova geração é necessária).
- A **edição manual dos valores de uma linha** só é permitida quando a fonte de dados foi criada por upload direto (não é permitida para fontes vindas de Google Drive/URL, nem diretamente para imagens). Também reseta a emissão para `DRAFT`.

### 3.6 Mapeamento de variáveis

- Cada variável do template pode ser associada a, no máximo, uma coluna da fonte de dados, e cada coluna só pode ser usada por uma variável por vez.
- Ao definir/trocar template ou fonte de dados, o sistema tenta reaproveitar o mapeamento anterior e também tenta mapear automaticamente variáveis e colunas com nomes iguais (ignorando acentos, maiúsculas/minúsculas e símbolos).
- **Todas as variáveis do template precisam estar mapeadas** para que seja possível gerar certificados e enviar e-mails — variáveis sem coluna associada bloqueiam esses passos seguintes.
- Alterar o mapeamento reseta todas as linhas da fonte de dados para `PENDING`, exigindo nova geração.

### 3.7 Geração de certificados

- Requisitos para iniciar a geração: a emissão deve ter template e fonte de dados definidos, a fonte de dados deve ter ao menos 1 linha, todas as variáveis devem estar mapeadas, todas as linhas devem estar no estado `PENDING` (ou seja, não é possível iniciar uma nova geração completa sobre uma emissão parcialmente gerada — nesse caso usa-se "tentar novamente" apenas para as linhas que falharam), e o usuário precisa ter créditos suficientes para cobrir 1 crédito por linha.
- Ao iniciar uma nova geração, quaisquer certificados anteriormente gerados para a emissão são apagados do armazenamento antes da nova geração.
- Cada linha é processada de forma assíncrona (fila), transitando de `PENDING`/`RETRYING` para `RUNNING` e depois para `COMPLETED` (com o tamanho do PDF gerado) ou `FAILED`.
- Quando todas as linhas terminam de processar (sucesso ou falha), a emissão é automaticamente marcada como `GENERATED`.
- É possível **tentar novamente** apenas as linhas com status `FAILED` — essa ação não é permitida se não houver nenhuma linha `FAILED`, e não consome créditos adicionais.
- Nenhuma dessas ações é permitida em uma emissão `EMITTED`.

### 3.8 Envio de e-mails

- Requisitos para enviar: a emissão não pode já estar `EMITTED`, deve haver fonte de dados com linhas, e a coluna escolhida como destinatário deve existir na fonte de dados e conter um e-mail válido em **todas** as linhas — caso contrário o envio inteiro é bloqueado antes de começar.
- Assunto: até 255 caracteres. Corpo: até 800 caracteres.
- O envio pode ser imediato ou agendado para uma data futura. Envio imediato dispara o processo de envio para todos os destinatários e marca a emissão como `EMITTED`. Envio agendado marca a emissão como `SCHEDULED` (o disparo automático na data agendada ainda não é executado pelo sistema — funcionalidade reconhecida no domínio, mas pendente de implementação operacional).
- Se o processo de envio falhar na infraestrutura, a emissão retorna de `EMITTED` para `GENERATED` e o e-mail é marcado com erro (`INTERNAL_ERROR`), permitindo nova tentativa.
- Após o envio bem-sucedido, é possível **reenviar** o e-mail apenas para linhas específicas selecionadas (por exemplo, para corrigir endereços que falharam) — essa ação só é permitida se a emissão já estiver `EMITTED` e se a coluna de e-mail original ainda existir na fonte de dados.

### 3.9 Download e visualização

- Um certificado individual só pode ser baixado/visualizado se sua linha estiver com status `COMPLETED`.
- É possível baixar certificados de múltiplas linhas selecionadas em um arquivo compactado (ZIP), no formato PDF ou no formato original do template (ex. DOCX/PPTX).
- É possível baixar **todos** os certificados de uma emissão de uma vez, mas essa ação exige que todas as linhas já tenham terminado de processar.

### 3.10 Solicitação e concessão de acesso

- O aplicativo opera com o login Google restrito a uma lista de usuários de teste autorizados no console do Google (modo de testagem do OAuth). Um usuário sem acesso pode **solicitar acesso**, o que envia um e-mail ao responsável pelo sistema pedindo que o solicitante seja adicionado manualmente a essa lista.
- **Conceder acesso** é uma ação disponível apenas a dois e-mails fixos de administração (não existe um papel de administrador configurável no sistema). Essa ação apenas envia um e-mail ao usuário avisando que o acesso foi concedido — a inclusão efetiva na lista de testadores do Google é feita manualmente, fora do sistema, pelo responsável.

## 4. Interface

### 4.1 Lista de emissões e métricas (página inicial)

- Um botão de criação abre um formulário simples com apenas o campo de nome (obrigatório, até 100 caracteres); ao confirmar, o usuário é levado direto para a página da nova emissão.
- A lista exibe nome, data de criação e um selo colorido de status (Rascunho/Agendado/Gerado/Emitido) para cada emissão, com busca por nome.
- Dois cartões de métricas mostram o total histórico de certificados gerados e de e-mails enviados, cada um com um gráfico da atividade diária dos últimos ~30 dias.
- O saldo de créditos do usuário é exibido no cabeçalho, com uma explicação de que 1 crédito é gasto por linha gerada e que os créditos são renovados diariamente.

### 4.2 Página da emissão — Template

- O usuário escolhe entre upload local, seleção via Google Drive ou link compartilhável.
- Após definido, exibe nome do arquivo, origem, ação de abrir/baixar o arquivo e a lista de variáveis Liquid detectadas.
- Template pode ser substituído, removido ou (se vindo do Drive/link) atualizado; qualquer uma dessas ações mostra um aviso de que será necessário gerar os certificados novamente caso já existam certificados gerados. Todas ficam bloqueadas se a emissão já foi emitida.
- Um aviso visual indica se o arquivo do Drive pertence a uma conta Google diferente da atualmente conectada.

### 4.3 Página da emissão — Fonte de dados

- Mesmas três origens de entrada; aceita planilhas ou imagens (com indicação de que imagens passam por extração de dados via IA).
- Exibe uma tabela configurável dos dados (primeiras linhas, com opção de ver todas), permitindo alterar o tipo de cada coluna (incluindo separador e tipo de item para colunas do tipo lista) e editar valores de linha quando a origem for upload.
- Trocas de tipo de coluna "arriscadas" ou edições de linha mostram aviso de que será necessário gerar novamente caso já existam certificados gerados.
- Fontes baseadas em imagem oferecem a ação de "converter em planilha", com escolha de formato (CSV/XLSX) e destino (baixar localmente ou salvar no Google Drive).
- Depois de gerados os certificados, linhas concluídas podem ser selecionadas para visualizar, baixar (PDF ou formato original, em lote compactado) ou, se o e-mail já foi enviado, reenviar apenas para as linhas escolhidas. Linhas com falha aparecem destacadas.

### 4.4 Página da emissão — Mapeamento de variáveis

- Cada variável do template é listada com um seletor da coluna correspondente da fonte de dados; colunas já usadas por outra variável não aparecem como opção.
- Um aviso indica quando a fonte de dados tem menos colunas do que variáveis existentes no template.
- Uma mensagem de sucesso aparece quando todas as variáveis estão mapeadas; enquanto isso não ocorrer, geração e envio de e-mail permanecem bloqueados/ocultos.
- Alterações precisam ser salvas explicitamente (com opção de descartar); salvar após já existirem certificados gerados também mostra o aviso de necessidade de gerar novamente.

### 4.5 Página da emissão — Geração de certificados

- Um botão único dispara a geração de todas as linhas; fica desabilitado sem linhas na fonte de dados, com a emissão já emitida, ou com a geração já concluída.
- Durante o processamento, uma barra de progresso mostra quantas linhas já terminaram, atualizada em tempo real; ao final, mostra quantos certificados foram gerados com sucesso e quantos falharam.
- Havendo falhas, um botão de "tentar novamente" reprocessa apenas as linhas com falha, com seu próprio indicador de progresso.
- Créditos insuficientes bloqueiam a geração com uma mensagem explicando que é necessário aguardar a renovação diária.

### 4.6 Página da emissão — Envio de e-mails

- Formulário com seletor da coluna de destinatários, campo de assunto e corpo (editor de texto), e abas para "Enviar agora" ou "Agendar envio" — o agendamento está sinalizado como indisponível ("Em breve") na interface atual.
- O envio fica bloqueado até que todos os certificados estejam gerados e todas as variáveis mapeadas, com aviso explicativo.
- Mostra a contagem de destinatários que receberão o certificado antes do envio.
- Após o envio, a emissão fica com a maior parte de suas seções (template, fonte de dados, mapeamento) bloqueada para edição, e uma mensagem confirma que os certificados foram enviados.
- Reenvio para linhas específicas é feito a partir da tabela de dados (seção de Fonte de Dados), selecionando as linhas desejadas.

### 4.7 Cabeçalho da emissão e ajuda

- O nome da emissão é editável diretamente no cabeçalho da página; a exclusão da emissão (ícone de lixeira, com confirmação irreversível) fica desabilitada quando a emissão já foi emitida.
- Um botão de dicas apresenta um carrossel explicando a sintaxe de variáveis Liquid, onde visualizar/baixar certificados gerados e como converter fontes de dados baseadas em imagem em planilha; aparece automaticamente na primeira visita do navegador e pode ser reaberto manualmente.
