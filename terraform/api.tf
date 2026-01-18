resource "google_project_service" "gcp_services" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "drive.googleapis.com",
    "slides.googleapis.com",
    "picker.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudscheduler.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "storage.googleapis.com",
    "pubsub.googleapis.com",
    "cloudtasks.googleapis.com",
  ])

  project  = var.project_id
  service  = each.value
  disable_on_destroy         = false
}