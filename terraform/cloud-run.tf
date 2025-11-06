locals {
  app_name = "certificate-management${local.suffix}"
  generate_pdfs_name = "generate-pdfs${local.suffix}"
}

resource "google_cloud_run_v2_service" "app" {
  name     = local.app_name
  location = var.region
  project  = var.project_id

  deletion_protection = false

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
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
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
        name = "SUFFIX"
        value = local.suffix
      }

      env {
        name  = "CERTIFICATES_BUCKET"
        value = google_storage_bucket.certificates.name
      }

      env {
        name = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name = "GENERATE_PDFS_URL"
        value = google_cloud_run_v2_service.generate_pdfs.uri
      }

      env {
        name = "CLOUD_FUNCTIONS_SA_EMAIL"
        value = google_service_account.app_service_account.email
      }
    }

    timeout = "600s"
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

# They are not public by default, so we need to add this IAM member
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "cloud_run_url" {
  value = "https://${google_cloud_run_v2_service.app.name}-${data.google_project.project.number}.${google_cloud_run_v2_service.app.location}.run.app"
  description = "Cloud Run URL"
}

output "cloud_run_name" {
  value       = google_cloud_run_v2_service.app.name
  description = "Cloud Run service name"
}









resource "google_cloud_run_v2_service" "generate_pdfs" {
  name     = local.generate_pdfs_name
  location = var.region
  project  = var.project_id

  deletion_protection = false

  depends_on = [
    google_project_service.gcp_services
  ]

  # ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.app_service_account.email

    # scaling {
    #   min_instance_count = 0
    #   max_instance_count = 1
    # }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      # resources {
      #   limits = {
      #     cpu    = "2"
      #     memory = "1Gi"
      #   }
      # }

      env {
        name = "APP_BASE_URL"
        value = "https://${local.app_name}-${data.google_project.project.number}.${var.region}.run.app"
      }

      env {
        name  = "CERTIFICATES_BUCKET"
        value = google_storage_bucket.certificates.name
      }

      env {
        name = "SOFFICE_PATH"
        value = "/usr/bin/soffice"
      }
    }

    timeout = "600s"
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }
}

# This is not necessary because the SA already has the permission in the project scope.
# However, for clarity, we add it here to show that the app service can invoke the generate_pdfs service.
# This permission is in the service scope.
# resource "google_cloud_run_v2_service_iam_member" "allow_app_to_invoke_generate_pdfs" {
#   project  = var.project_id
#   location = google_cloud_run_v2_service.generate_pdfs.location
#   name     = google_cloud_run_v2_service.generate_pdfs.name
#   role     = "roles/run.invoker"
#   member   = "serviceAccount:${google_service_account.app_service_account.email}"
# }

resource "google_cloud_run_v2_service_iam_member" "generate_pdfs_public_access" {
  project  = var.project_id
  location = google_cloud_run_v2_service.generate_pdfs.location
  name     = google_cloud_run_v2_service.generate_pdfs.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "generate_pdfs_cloud_run_name" {
  value       = google_cloud_run_v2_service.generate_pdfs.name
  description = "Cloud Run service name for generating PDFs of certificates"
}

# output "generate_pdfs_cloud_run_url" {
#   value = "https://${google_cloud_run_v2_service.generate_pdfs.name}-${data.google_project.project.number}.${google_cloud_run_v2_service.generate_pdfs.location}.run.app"
#   description = "Cloud Run URL for generating PDFs of certificates"
# }
