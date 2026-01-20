resource "google_cloud_tasks_queue" "certificate_generations_queue" {
  name     = "certificate-generations${local.suffix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 100
    max_concurrent_dispatches = 50
  }

  retry_config {
    max_attempts = 50
    # max_retry_duration = "0s" // Unlimited
    min_backoff = "1s"
    max_backoff = "3600s"
    max_doublings = 3
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







resource "google_cloud_tasks_queue" "send_certificate_emails_queue" {
  name     = "send-certificate-emails${local.suffix}"
  location = var.region

  rate_limits {
    max_dispatches_per_second = 100
    max_concurrent_dispatches = 50
  }

  retry_config {
    max_attempts = 10
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
        google_cloudfunctions2_function.send_certificate_emails_function.url,
        "https://",
        ""
      )
      path_override {
        path = "/main"
      }
    }
    oidc_token {
      service_account_email = google_service_account.app_service_account.email
      audience              = google_cloudfunctions2_function.send_certificate_emails_function.url
    }
  }
}