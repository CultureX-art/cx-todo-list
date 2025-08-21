terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "bucket_name" {
  type = string
}

provider "aws" {
  region = var.region != null ? var.region : "us-east-1"
}

variable "region" {
  type    = string
  default = null
}

resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}
output "bucket_id" { value = aws_s3_bucket.site.id }
