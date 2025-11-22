# data "archive_file" "generate_pdfs_zip" {
#   type        = "zip"
#   source_dir  = "${path.module}/../cloud-functions/generate-pdfs"
#   output_path = "${path.module}/../cloud-functions/builds/generate-pdfs.zip"

#   excludes = [
#     ".git",
#     ".gitignore",
#     "__pycache__",
#     "*.pyc",
#     ".pytest_cache",
#     "venv",
#     ".venv",
#   ]
# }

# resource "google_storage_bucket_object" "generate_pdfs_object" {
#   name   = "generate-pdfs${local.suffix}-${data.archive_file.generate_pdfs_zip.output_md5}.zip"
#   bucket = google_storage_bucket.cloud_functions.name
#   content_type = "application/zip"
#   source = data.archive_file.generate_pdfs_zip.output_path

#   depends_on = [ data.archive_file.generate_pdfs_zip ]
# }

# resource "google_cloudfunctions2_function" "generate_pdfs_function" {
#   name     = "generate-pdfs${local.suffix}"
#   location = var.region
  
#   build_config {
#     # runtime     = "python311"
#     entry_point = "main"
#     runtime = "custom"

#     # O Terraform vai usar Cloud Build automaticamente para buildar o Docker
#     source {
#       storage_source {
#         bucket = google_storage_bucket.cloud_functions.name
#         object = google_storage_bucket_object.generate_pdfs_object.name
#       }
#     }

#     docker_repository = google_artifact_registry_repository.cloud_functions_repository.id
    
#     # Variáveis de ambiente durante o build (se necessário)
#     # environment_variables = {
#     #   BUILD_VAR = "value"
#     # }
#   }
  
#   service_config {
#     max_instance_count = 10
#     min_instance_count = 0
#     available_memory   = "256M"
#     timeout_seconds    = 240
    
#     environment_variables = {
#       APP_BASE_URL        = "https://${google_cloud_run_v2_service.app.name}-${data.google_project.project.number}.${google_cloud_run_v2_service.app.location}.run.app"
#       SOFFICE_PATH        = "/usr/bin/soffice"
#       CERTIFICATES_BUCKET = google_storage_bucket.certificates.name
#     }
    
#     service_account_email = google_service_account.app_service_account.email
#   }

#   depends_on = [ google_storage_bucket_object.generate_pdfs_object ]
# }

# resource "google_artifact_registry_repository" "cloud_functions_repository" {
#   location      = var.region
#   repository_id = "cloud-functions${local.suffix}"
#   format        = "DOCKER"
  
#   description = "Repository for Cloud Functions container images"
# }

# # They are not public by default, so we need to add this IAM member
# resource "google_cloud_run_service_iam_member" "public_invoker" {
#   location = google_cloudfunctions2_function.generate_pdfs_function.location
#   service  = google_cloudfunctions2_function.generate_pdfs_function.name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

# # output "function_uri" {
# #   value = google_cloudfunctions2_function.generate_pdfs_function.service_config[0].uri
# # }









data "archive_file" "send_certificate_emails_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../cloud-functions/send-certificate-emails"
  output_path = "${path.module}/../cloud-functions/builds/send-certificate-emails.zip"

  excludes = [
    ".git",
    ".gitignore",
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    "venv",
    ".venv",
  ]
}

resource "google_storage_bucket_object" "send_certificate_emails_object" {
  name   = "send-certificate-emails${local.suffix}-${data.archive_file.send_certificate_emails_zip.output_md5}.zip"
  bucket = google_storage_bucket.cloud_functions.name
  content_type = "application/zip"
  source = data.archive_file.send_certificate_emails_zip.output_path
}

resource "google_cloudfunctions2_function" "send_certificate_emails_function" {
  name     = "send-certificate-emails${local.suffix}"
  location = var.region
  
  build_config {
    # runtime     = "python311"
    entry_point = "main"
    runtime = "python313"

    # O Terraform vai usar Cloud Build automaticamente para buildar o Docker
    source {
      storage_source {
        bucket = google_storage_bucket.cloud_functions.name
        object = google_storage_bucket_object.send_certificate_emails_object.name
      }
    }

    # docker_repository = google_artifact_registry_repository.cloud_functions_repository.id
    
    # Variáveis de ambiente durante o build (se necessário)
    # environment_variables = {
    #   BUILD_VAR = "value"
    # }
  }
  
  service_config {
    max_instance_count = 10
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 240
    
    environment_variables = {
      APP_BASE_URL        = "https://${google_cloud_run_v2_service.app.name}-${data.google_project.project.number}.${google_cloud_run_v2_service.app.location}.run.app"
      CERTIFICATES_BUCKET = google_storage_bucket.certificates.name
      SMTP_USER = var.smtp_user
      SMTP_PASSWORD = var.smtp_password
    }
    
    service_account_email = google_service_account.app_service_account.email
  }
}

# They are not public by default, so we need to add this IAM member
resource "google_cloud_run_service_iam_member" "public_invoker" {
  location = google_cloudfunctions2_function.send_certificate_emails_function.location
  service  = google_cloudfunctions2_function.send_certificate_emails_function.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.app_service_account.email}"
}

# output "function_uri" {
#   value = google_cloudfunctions2_function.send_certificate_emails_function.service_config[0].uri
# }