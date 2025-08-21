module "site" {
  source      = "../../modules/s3_static_site"
  bucket_name = "example-aipp-site-bucket"
  region      = "us-east-1"
}
