resource "google_storage_bucket" "certificates" {
  name          = "certificates${local.suffix}-${local.project_id_hash}"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
}