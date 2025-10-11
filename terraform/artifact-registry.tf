resource "google_artifact_registry_repository" "docker_repository" {
  location      = var.region
  repository_id = "application-repository${local.suffix}"
  description   = "Docker repository for Cloud Run images"
  format        = "DOCKER"
}

output "artifact_registry_path" {
  value = "${google_artifact_registry_repository.docker_repository.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repository.repository_id}"
}
