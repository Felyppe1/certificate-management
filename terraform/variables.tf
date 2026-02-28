locals {
  suffix = var.branch == "main" ? "" : "-${var.branch}"
  project_id_hash = substr(md5(var.project_id), 0, 8)
  pubsub_service_account = "service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com" # Internally managed by Google
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The region to deploy resources"
  type        = string
  default     = "us-central1"
}

variable "branch" {
  description = "The branch name for the environment"
  type        = string
}

variable "smtp_user" {
  description = "SMTP user for sending emails"
  type        = string
}

variable "smtp_password" {
  description = "SMTP password for sending emails"
  type        = string
  sensitive   = true
}

# variable "google_api_key" {
#   description = "Google API key for the cloud run service"
#   type        = string
#   sensitive   = true
# }

variable "environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default     = {}
}
