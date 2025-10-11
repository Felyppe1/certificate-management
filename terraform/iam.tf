resource "google_service_account" "app_service_account" {
  project      = var.project_id
  account_id   = "app-sa${local.suffix}"
  display_name = "Service account used by the application to communicate with the services required"

  depends_on = [
    google_project_service.gcp_services
  ]
}

resource "google_project_iam_member" "sa_roles_runner" {
  for_each = toset([
    "roles/cloudfunctions.invoker",
    "roles/run.invoker",
    "roles/workflows.invoker",
    "roles/logging.logWriter",
    "roles/secretmanager.secretAccessor",
    "roles/cloudsql.client",
    "roles/storage.objectAdmin"
  ])

  role    = each.value
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
  project = var.project_id
}

output "service_account_email" {
  value       = google_service_account.app_service_account.email
  description = "Email of the application's service account"
}
