locals {
  suffix = var.branch == "main" ? "" : "-${var.branch}"
  project_id_hash = substr(md5(var.project_id), 0, 8)
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

variable "environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default     = {}
}
