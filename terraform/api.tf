resource "google_project_service" "gcp_services" {
  for_each = toset([
    "drive.googleapis.com",
    "slides.googleapis.com",
    "picker.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com"
  ])

  project  = var.project_id
  service  = each.value
  disable_on_destroy         = false
}