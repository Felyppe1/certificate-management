resource "google_cloud_run_v2_service" "app" {
  name     = "certificate-management${local.suffix}"
  location = var.region
  project  = var.project_id

  depends_on = [
    google_project_service.gcp_services
  ]

  template {
    service_account = google_service_account.app_service_account.email

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = "gcr.io/cloudrun/hello"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      env {
        name  = "CERTIFICATES_BUCKET"
        value = google_storage_bucket.certificates.name
      }

      env {
        name = "GCP_PROJECT_ID"
        value = var.project_id
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.app.uri
  description = "Cloud Run URL"
}

output "cloud_run_name" {
  value       = google_cloud_run_v2_service.app.name
  description = "Cloud Run service name"
}