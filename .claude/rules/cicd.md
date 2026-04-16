# CI/CD

Pipeline defined in `.github/workflows/deploy.yml`. Runs on push to `main` (production) or `develop`. Resources in the `develop` environment get a `-develop` suffix appended to their names.

## Jobs (sequential)

### 1. `terraform-plan`
- Authenticates to GCP via **Workload Identity Federation** (no service account key stored in the repo)
- Exports GitHub Secrets as `TF_VAR_*` environment variables
- `terraform init` + `terraform plan -out=tfplan`
- Uploads artifacts: `tfplan` and the Cloud Function zips from `cloud-functions/builds/`

### 2. `terraform-apply` _(depends on terraform-plan)_
- Downloads `tfplan` and Cloud Function builds
- `terraform apply tfplan`
- Extracts Terraform outputs (Artifact Registry path, Cloud Run URL and service name) and saves them as artifacts for the next job

### 3. `deploy-certificate-management` _(depends on terraform-apply)_
- Downloads the Artifact Registry path from the previous job
- Builds the multi-stage Docker image with build args `DB_URL` and `CLOUD_RUN_APP_URL`
- Pushes to Artifact Registry tagged with `$GITHUB_SHA`
- Runs `npm run prisma:deploy` inside the container to apply migrations (uses `DB_DIRECT_URL` to bypass the connection pooler)
- `gcloud run deploy` pointing to the new image

## Application environment variables

App-level env vars (everything the Next.js server needs at runtime) are passed to Terraform as a single JSON string via the `environment_variables` variable (`TF_VAR_environment_variables`). Terraform injects them into the Cloud Run service definition. Adding or removing an env var means updating both the GitHub Secret that holds the JSON and the Terraform variable declaration.

## Secrets

All come from GitHub Secrets: `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT_NAME`, `DB_URL`, `DB_DIRECT_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `REDIS_URL`, `RESEND_API_KEY`, `environment_variables`, among others.

## Docker

`Dockerfile` uses multi-stage build (deps → builder → runner) based on Node.js 20 slim. The Next.js build stage allocates 4 GB of memory.
