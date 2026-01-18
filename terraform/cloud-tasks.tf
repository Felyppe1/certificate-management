resource "google_cloud_tasks_queue" "http_target_oidc" {
  name     = "certificate-generations${local.suffix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 100
    max_concurrent_dispatches = 50
  }

  retry_config {
    max_attempts = 20
    # max_retry_duration = "0s" // Unlimited
    min_backoff = "1s"
    max_backoff = "3600s"
    max_doublings = 5
  }

  http_target {
    http_method = "POST"
    uri_override {
      scheme = "HTTPS"
      host   = replace(
        google_cloud_run_v2_service.generate_pdfs.uri,
        "https://",
        ""
      )
    }
    oidc_token {
      service_account_email = google_service_account.app_service_account.email
      audience              = google_cloud_run_v2_service.generate_pdfs.uri
    }
  }
}