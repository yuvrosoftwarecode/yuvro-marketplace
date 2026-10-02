from __future__ import annotations

import logging
from urllib.parse import quote, urljoin

from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def _build_unsigned_url(obj, bucket):
    public_endpoint = (
        getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", "")
        or getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        or ""
    )
    if public_endpoint:
        base = public_endpoint.rstrip("/") + "/"
        return urljoin(base, f"{bucket}/{quote(obj, safe='/')}")

    region = (
        getattr(settings, "AWS_S3_REGION_NAME", "")
        or getattr(settings, "AWS_REGION", "")
        or "us-east-1"
    )
    addressing = (
        getattr(settings, "AWS_S3_ADDRESSING_STYLE", "") or "virtual"
    ).strip().lower()
    key = quote(obj, safe="/")
    if addressing == "path":
        return f"https://s3.{region}.amazonaws.com/{bucket}/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def _build_signed_url(obj, bucket):
    try:
        import boto3
    except ImportError:
        return None

    region = (
        getattr(settings, "AWS_S3_REGION_NAME", "")
        or getattr(settings, "AWS_REGION", "")
        or "us-east-1"
    )
    custom_endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "") or None
    addressing = (
        getattr(settings, "AWS_S3_ADDRESSING_STYLE", "") or "virtual"
    ).strip().lower()
    try:
        from botocore.config import Config

        boto_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": addressing},
        )
    except ImportError:
        boto_config = None
    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", "") or None,
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", "") or None,
        endpoint_url=custom_endpoint or f"https://s3.{region}.amazonaws.com",
        config=boto_config,
    )
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": obj.lstrip("/")},
            ExpiresIn=getattr(settings, "AWS_QUERYSTRING_EXPIRE", 86400),
        )
        public_endpoint = getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", "")
        internal_endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        if public_endpoint and internal_endpoint and internal_endpoint in url:
            url = url.replace(internal_endpoint, public_endpoint, 1)
        return url
    except Exception:
        return None


def _extract_storage_key(url_or_key: str, bucket: str) -> tuple[str, bool]:
    """
    Given a storage key or a full URL, determines if it points to our S3/MinIO bucket.
    Returns (cleaned_key, is_bucket_asset).
    If it's an external URL (e.g. from Clearbit, Unsplash), returns (raw_url, False).
    """
    if not url_or_key:
        return "", False

    raw = str(url_or_key).strip()
    if not raw.startswith(("http://", "https://")):
        return raw.lstrip("/"), True

    try:
        from urllib.parse import unquote, urlparse

        parsed = urlparse(raw)
        netloc = (parsed.netloc or "").lower()
        path = unquote(parsed.path).lstrip("/")
        b_lower = bucket.lower()

        # Virtual-hosted style: <bucket>.s3.<region>.amazonaws.com/<key>
        if b_lower and (netloc.startswith(f"{b_lower}.") or f".{b_lower}." in netloc):
            return path, True

        # Path style: s3.<region>.amazonaws.com/<bucket>/<key>
        if b_lower and path.startswith(f"{b_lower}/"):
            return path[len(b_lower) + 1 :], True

        # Custom or MinIO endpoint match
        for ep_attr in ("AWS_S3_PUBLIC_ENDPOINT_URL", "AWS_S3_ENDPOINT_URL"):
            endpoint = getattr(settings, ep_attr, "") or ""
            if endpoint:
                ep_parsed = urlparse(endpoint)
                if ep_parsed.netloc and ep_parsed.netloc.lower() == netloc:
                    if b_lower and path.startswith(f"{b_lower}/"):
                        return path[len(b_lower) + 1 :], True
                    return path, True
    except Exception:
        pass

    return raw, False


def build_public_url(object_name, public_only=False):
    if not object_name:
        return None

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or ""
    key, is_bucket_asset = _extract_storage_key(object_name, bucket)
    if not is_bucket_asset:
        return key or None

    if not bucket:
        return None

    has_public_endpoint = bool(getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", ""))
    querystring_auth = getattr(settings, "AWS_QUERYSTRING_AUTH", True)

    if querystring_auth and not has_public_endpoint:
        signed = _build_signed_url(key, bucket)
        if signed:
            return signed
    return _build_unsigned_url(key, bucket)


def upload_image(*, key, file_obj, replace_extensions=()):
    """
    If `replace_extensions` is provided, prior objects with the same
    base name but each of those extensions are deleted first — useful
    for "single image per (key)" semantics (e.g. profile_image.jpg
    replaces profile_image.png).

    Returns the storage key (not a URL); pass it to build_public_url when
    serializing for clients.
    """
    app_name = (getattr(settings, "APP_NAME", "") or "").strip().strip("/")
    clean_key = key.lstrip("/")
    if app_name and (clean_key == app_name or clean_key.startswith(f"{app_name}/")):
        full_key = clean_key
    else:
        full_key = (f"{app_name}/" if app_name else "") + clean_key

    try:
        if replace_extensions and "." in full_key:
            base, _ = full_key.rsplit(".", 1)
            for prior_ext in replace_extensions:
                try:
                    default_storage.delete(f"{base}.{prior_ext}")
                except Exception:
                    pass

        return default_storage.save(full_key, file_obj)
    except Exception:
        logger.exception("upload_image failed (key=%s)", full_key)
        raise


upload_file = upload_image
