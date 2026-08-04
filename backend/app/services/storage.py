import os
import shutil
import uuid
from pathlib import Path
from app.core.config import settings

class StorageBackend:
    def save(self, file_content: bytes, filename: str, path_prefix: str = "") -> str:
        raise NotImplementedError

    def get_url(self, stored_name: str) -> str:
        raise NotImplementedError

class LocalStorage(StorageBackend):
    def __init__(self, base_dir: str = settings.upload_dir):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, file_content: bytes, filename: str, path_prefix: str = "") -> str:
        directory = self.base_dir / path_prefix
        directory.mkdir(parents=True, exist_ok=True)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        safe_name = f"{uuid.uuid4().hex}.{ext}"
        path = directory / safe_name
        path.write_bytes(file_content)
        return safe_name

    def get_url(self, stored_name: str, path_prefix: str = "") -> str:
        return f"/uploads/{path_prefix}/{stored_name}"

class S3Storage(StorageBackend):
    def __init__(self, bucket: str, region: str = "us-east-1"):
        self.bucket = bucket
        self.region = region
        try:
            import boto3
            self.s3 = boto3.client('s3', region_name=region)
        except ImportError:
            self.s3 = None

    def save(self, file_content: bytes, filename: str, path_prefix: str = "") -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        safe_name = f"{uuid.uuid4().hex}.{ext}"
        s3_key = f"{path_prefix}/{safe_name}"
        if self.s3:
            self.s3.put_object(Bucket=self.bucket, Key=s3_key, Body=file_content)
        else:
            # Mock behavior if boto3 is not installed
            print(f"[MOCK S3] Uploading {filename} to s3://{self.bucket}/{s3_key}")
        return safe_name

    def get_url(self, stored_name: str, path_prefix: str = "") -> str:
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{path_prefix}/{stored_name}"

def get_storage() -> StorageBackend:
    provider = getattr(settings, "storage_provider", "local")
    if provider == "s3":
        return S3Storage(bucket=getattr(settings, "s3_bucket", "my-bucket"))
    return LocalStorage()
