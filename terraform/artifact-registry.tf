resource "google_artifact_registry_repository" "docker_repository" {
  location      = var.region
  repository_id = "application-repository${local.suffix}"
  description   = "Docker repository for Cloud Run images"
  format        = "DOCKER"
  
  depends_on = [
    google_project_service.gcp_services
  ]

  cleanup_policies {
    id     = "keep-last-5"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policy_dry_run = false
}

output "artifact_registry_path" {
  value = "${google_artifact_registry_repository.docker_repository.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repository.repository_id}"
}
