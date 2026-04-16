# Terraform

Infrastructure defined in `terraform/`. Remote backend on Google Cloud Storage (separate bucket per environment).

## Key resources

| File                     | Resource                                                         |
|--------------------------|------------------------------------------------------------------|
| `cloud-run.tf`           | `google_cloud_run_v2_service "app"` — Next.js (2 vCPU, 1Gi, min=0, max=1) |
| `cloud-function.tf`      | `generate_certificates_function` (Python 3.12, 512M, 6 concurrent) |
|                          | `send_certificate_emails_function` (Python 3.13, 256M, 10 concurrent) |
| `cloud-tasks.tf`         | `generate_pdfs_queue` — dispatches jobs to the PDF Cloud Function |
|                          | `send_certificate_emails_queue` — dispatches email jobs          |
| `bucket.tf`              | Certificates bucket + Cloud Function zip bucket                  |
| `artifact-registry.tf`   | Docker repository for Cloud Run images                           |
| `iam.tf`                 | App service account + least-privilege role bindings              |
| `cloud-scheduler.tf`     | Periodic jobs (e.g. credit reset)                                |
| `api.tf`                 | API Gateway configuration                                        |

## Environments

The `branch` variable determines the resource name suffix (`""` for main, `"-develop"` for develop). Terraform state is stored in separate GCS buckets per environment.

## Cloud Tasks retry config

| Queue                           | Max attempts | Initial backoff | Max backoff |
|---------------------------------|-------------|-----------------|-------------|
| `generate_pdfs_queue`           | 50          | 1s              | 3600s       |
| `send_certificate_emails_queue` | 10          | 1s              | 3600s       |
