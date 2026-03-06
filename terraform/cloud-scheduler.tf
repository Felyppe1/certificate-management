resource "google_cloud_scheduler_job" "reset_daily_credits" {
  name      = "reset-daily-credits${local.suffix}"
  project   = var.project_id
  region    = var.region
  schedule  = "0 0 * * *"
  time_zone = "America/Sao_Paulo"

  depends_on = [
    google_project_service.gcp_services,
    google_cloud_run_v2_service.app,
  ]

  http_target {
    uri         = "${google_cloud_run_v2_service.app.uri}/api/internal/users/reset-credits"
    http_method = "POST"
    body        = base64encode("{}")

    headers = {
      Content-Type = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.app_service_account.email
      audience              = google_cloud_run_v2_service.app.uri
    }
  }
}
