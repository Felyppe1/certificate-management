# CI/CD

Pipeline definido em `.github/workflows/deploy.yml`. Executa em qualquer push — `main` vai para produção, qualquer outra branch usa o nome da branch como sufixo nos recursos GCP.

## Jobs (sequenciais)

### 1. `test`

Roda os testes unitários antes de qualquer deploy.

- Setup Node.js 20 + `npm ci`
- `npx prisma generate` (com DB_URL dummy para não precisar de banco real)
- `npm run test:unit`

Testes de integração e E2E estão configurados mas comentados (podem ser habilitados quando necessário).

### 2. `terraform-plan` _(depende de: test)_

- Autentica no GCP via **Workload Identity Federation** (sem service account key armazenada no repo)
- Exporta os secrets do GitHub como variáveis de ambiente `TF_VAR_*`
- Cria o bucket de estado do Terraform no GCS se não existir
- `terraform init` + `terraform plan -out=tfplan`
- Faz upload dos artefatos: `tfplan` e os zips das Cloud Functions de `cloud-functions/builds/`

### 3. `terraform-apply` _(depende de: terraform-plan)_

- Baixa `tfplan` e os builds das Cloud Functions
- `terraform apply tfplan`
- Extrai outputs do Terraform (path do Artifact Registry, URL e nome do Cloud Run) e os salva como artefatos para o próximo job

### 4. `deploy-certificate-management` _(depende de: terraform-apply)_

- Baixa o path do Artifact Registry do job anterior
- Constrói a imagem Docker multi-stage com os build args `DB_URL` e `CLOUD_RUN_APP_URL`
- Faz push para o Artifact Registry com tag `$GITHUB_SHA`
- Executa `npm run prisma:deploy` dentro do container para aplicar migrations (usa `DB_DIRECT_URL` para contornar o connection pooler)
- `gcloud run deploy` apontando para a nova imagem

---

## Autenticação GCP — Workload Identity Federation

Em vez de armazenar uma service account key como secret, o pipeline usa WIF para trocar a identidade do GitHub Actions por credenciais temporárias do GCP:

```
GitHub Actions runner
  └── gera OIDC token assinado pelo próprio GitHub
        └── envia para o GCP Security Token Service
              └── GCP valida o token contra o WIF Provider configurado
                    └── devolve credenciais temporárias do service account
                          └── usadas pelo restante do job (Terraform, gcloud)
```

O que fica nos GitHub Secrets **não é uma chave** — são apenas dois identificadores:
- `GCP_WIF_PROVIDER` — ID do Workload Identity Pool Provider no GCP
- `GCP_SERVICE_ACCOUNT_NAME` — email do service account a ser impersonado

As credenciais temporárias expiram ao fim do job. A configuração da action está em `.github/actions/gcp-auth/action.yml`.

---

## Docker

`Dockerfile` usa build multi-stage baseado em Node.js 20 slim:

| Estágio | O que faz |
|---------|-----------|
| `deps` | `npm ci` — instala dependências com lockfile exato |
| `builder` | Recebe `node_modules` do estágio anterior, copia o código, roda `npm run build`. Recebe `DB_URL` e `NEXT_PUBLIC_BASE_URL` como build args (necessários para o Prisma client e Next.js). Produz o output `standalone`. |
| `runner` | Copia apenas o necessário para rodar: output standalone, assets estáticos, Prisma schema + migrations + client gerado. Roda como usuário não-root (`nextjs`). |

O `CMD` do runner é `npm start` → `node server.js` (servidor standalone do Next.js). **Migrations não rodam no CMD** — elas são aplicadas separadamente no job de deploy antes do `gcloud run deploy` (ver job 4 acima).

O output `standalone` do Next.js já inclui apenas as dependências necessárias em runtime, sem o `node_modules` completo.

---

## Variáveis de ambiente

Existem dois canais distintos de env vars no pipeline:

### Canal 1 — `TF_VAR_environment_variables` (JSON → Cloud Run)

Um único secret do GitHub contém um JSON com todas as env vars que o **servidor Next.js** precisa em runtime. O pipeline exporta esse JSON como `TF_VAR_environment_variables`; o Terraform itera sobre o map e injeta cada par chave/valor no serviço do Cloud Run.

Exemplos do que vai nesse JSON: `DB_URL`, `DB_DIRECT_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LOKI_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_BASE_URL`, etc.

Para adicionar ou remover uma env var da aplicação: atualizar o secret JSON **e** confirmar que a variável está declarada em `terraform/variables.tf`.

### Canal 2 — `TF_VAR_*` separados (usados pelo Terraform na infra)

Algumas variáveis são passadas diretamente ao Terraform como `TF_VAR_*` porque são usadas na **configuração de recursos GCP** (não na aplicação Next.js). Exemplos:

| Variável Terraform | Para que é usada |
|--------------------|-----------------|
| `project_id`, `region`, `branch` | Nomes e localização dos recursos |
| `google_client_id/secret/refresh_token` | Env vars da Cloud Function `generate-certificates` |
| `google_drive_folder_id` | Env var da Cloud Function `generate-certificates` |
| `resend_api_key` | Env var da Cloud Function `send-certificate-emails` |

Algumas variáveis aparecem nos **dois canais** — por exemplo, `GOOGLE_CLIENT_ID` vai tanto na Cloud Function (via `TF_VAR_google_client_id`) quanto no Cloud Run (via JSON), porque ambos precisam dela.

---

## Sufixo de ambiente

O Terraform usa a variável `branch` para determinar o sufixo dos recursos:

```hcl
locals {
  suffix = var.branch == "main" ? "" : "-${var.branch}"
}
```

- Branch `main` → sem sufixo → recursos de produção
- Qualquer outra branch → sufixo `-<nome-da-branch>` → recursos isolados por branch

O estado do Terraform é armazenado em um bucket GCS separado por ambiente.
