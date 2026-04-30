# Terraform

Infraestrutura definida em `terraform/`. Backend remoto no Google Cloud Storage (bucket separado por ambiente).

## Recursos principais

| Arquivo | Recurso |
|---------|---------|
| `cloud-run.tf` | `google_cloud_run_v2_service "app"` — Next.js |
| `cloud-function.tf` | `generate_certificates_function` — geração de PDFs |
| `cloud-function.tf` | `send_certificate_emails_function` — envio de e-mails |
| `cloud-tasks.tf` | `generate_pdfs_queue` — fila para jobs de PDF |
| `cloud-tasks.tf` | `send_certificate_emails_queue` — fila para jobs de e-mail |
| `bucket.tf` | Bucket de certificados + bucket de zips das Cloud Functions |
| `artifact-registry.tf` | Repositório Docker para imagens do Cloud Run |
| `iam.tf` | Service account da aplicação + bindings de roles |
| `cloud-scheduler.tf` | Jobs periódicos (ex.: reset de créditos) |
| `api.tf` | Configuração do API Gateway |

---

## Cloud Run — Next.js (`cloud-run.tf`)

```hcl
resource "google_cloud_run_v2_service" "app" {
  name = "certificate-management${local.suffix}"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      timeout = "1000s"
    }
  }
}
```

Configuração relevante:
- **CPU:** 2 vCPU
- **Memória:** 1 GiB
- **Scaling:** min=0, max=1 (cold start aceitável, sem escala horizontal)
- **Timeout:** 1000s (para downloads e operações longas)
- Env vars injetadas dinamicamente pelo Terraform a partir do map `environment_variables`

---

## Cloud Functions (`cloud-function.tf`)

### `generate-certificates` (geração de PDFs)

| Config | Valor |
|--------|-------|
| Runtime | Python 3.12 |
| Memória | 512 MB |
| CPU | 1 |
| Concorrência máxima | 6 requisições/instância |
| Instâncias máximas | 10 |
| Timeout | 240s |

### `send-certificate-emails` (envio de e-mails)

| Config | Valor |
|--------|-------|
| Runtime | Python 3.13 |
| Memória | 256 MB |
| Concorrência máxima | padrão |
| Instâncias máximas | 10 |
| Timeout | 240s |

Ambas as funções são empacotadas como zip a partir de `cloud-functions/builds/` (gerado pelo `data "archive_file"` do Terraform) e armazenadas no bucket de Cloud Functions antes do deploy.

---

## Cloud Tasks (`cloud-tasks.tf`)

### `generate-pdfs-queue`

| Parâmetro | Valor |
|-----------|-------|
| Max tentativas | 50 |
| Backoff inicial | 1s |
| Backoff máximo | 3600s |
| Max doublings | 3 |
| Max dispatches/s | 100 |
| Max concurrent | 50 |
| Target | Cloud Function `generate-certificates` |

### `send-certificate-emails-queue`

| Parâmetro | Valor |
|-----------|-------|
| Max tentativas | 10 |
| Backoff inicial | 1s |
| Backoff máximo | 3600s |
| Max doublings | 5 |
| Max dispatches/s | 100 |
| Max concurrent | 50 |
| Target | Cloud Function `send-certificate-emails` |

Ambas as filas usam OIDC token para autenticar as requisições às Cloud Functions.

---

## Ambientes e sufixo de recursos

```hcl
locals {
  suffix = var.branch == "main" ? "" : "-${var.branch}"
}
```

- Branch `main` → sem sufixo → recursos de produção
- Qualquer outra branch → `-<nome-da-branch>` no nome de todos os recursos

O estado do Terraform é armazenado em um bucket GCS próprio por ambiente (criado automaticamente pelo job `terraform-plan` se não existir).

---

## Service account e IAM (`iam.tf`)

Um único service account (`app_service_account`) com permissões mínimas para:
- Invocar Cloud Functions e Cloud Run
- Ler/escrever no bucket de certificados
- Publicar em tópicos Pub/Sub
- Enfileirar tasks no Cloud Tasks
- Ler secrets do Secret Manager (se aplicável)
