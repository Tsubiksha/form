import hashlib, hmac, json, re, time, uuid
from datetime import date, datetime
from pathlib import Path
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.form_version import FormVersion
from app.models.share_link import ShareLink
from app.models.submission import FormSubmission, SubmissionValue
from app.schemas.submission import SubmissionCreate
from app.services.conditional_logic import evaluate_conditional_rules, is_empty_value

router = APIRouter(prefix="/public/forms", tags=["Public Forms"])
legacy_router = APIRouter(prefix="/forms/public/forms", tags=["Public Forms"])

def link_version(token, db):
    link = db.query(ShareLink).filter_by(link_token=token, is_active=True).first()
    if not link: raise HTTPException(404, "Invalid or inactive share link")
    version = db.get(FormVersion, link.form_version_id)
    if not version or version.status != "published": raise HTTPException(410, "This form version is no longer available")
    return link, version

SUPPORTED_FILE_EXTENSIONS = {"pdf", "docx", "png", "jpg", "jpeg"}

def signed_upload_url(token, form_id, stored_name, expires=None):
    expires = int(expires or time.time() + 3600)
    safe_name = Path(stored_name).name
    message = f"{token}:{form_id}:{safe_name}:{expires}".encode()
    signature = hmac.new(settings.jwt_secret.encode(), message, hashlib.sha256).hexdigest()
    return f"/public/forms/{token}/uploads/{safe_name}?expires={expires}&signature={signature}"

def verify_upload_signature(token, form_id, stored_name, expires, signature):
    try:
        expires = int(expires)
    except (TypeError, ValueError):
        return False
    if expires < int(time.time()):
        return False
    expected = signed_upload_url(token, form_id, stored_name, expires).split("signature=", 1)[1]
    return hmac.compare_digest(expected, signature or "")

def file_rules(field):
    rules = {r["rule_type"]: r for r in field.get("validation_rules", [])}
    max_mb = None
    allowed = SUPPORTED_FILE_EXTENSIONS
    if "file_size" in rules and rules["file_size"].get("rule_value"):
        try: max_mb = float(rules["file_size"]["rule_value"])
        except (TypeError, ValueError): max_mb = None
    if "allowed_file_types" in rules and rules["allowed_file_types"].get("rule_value"):
        values = [x.strip().lower().lstrip(".") for x in rules["allowed_file_types"]["rule_value"].split(",") if x.strip()]
        selected = {x for x in values if x in SUPPORTED_FILE_EXTENSIONS}
        if selected: allowed = selected
    return allowed, max_mb

def validate_file_value(field, value):
    if not isinstance(value, dict): raise ValueError("Invalid file upload")
    allowed, max_mb = file_rules(field)
    name = str(value.get("name") or value.get("file_name") or "")
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    size = int(value.get("size") or 0)
    if ext not in allowed: raise ValueError(f"File type must be one of: {', '.join(sorted(x.upper() for x in allowed))}")
    if max_mb is not None and size > max_mb * 1024 * 1024: raise ValueError(f"File must be {max_mb:g} MB or smaller")

def rating_bounds(field):
    rules = {r["rule_type"]: r for r in field.get("validation_rules", [])}
    def number(rule_type, fallback):
        try: return int(float(rules.get(rule_type, {}).get("rule_value", fallback)))
        except (TypeError, ValueError): return fallback
    minimum = number("min_value", 1)
    maximum = number("max_value", 5)
    if maximum < minimum: maximum = minimum
    return minimum, maximum

def submission_response(submission):
    return {
        "id": submission.id,
        "response_id": submission.id,
        "message": "Response submitted successfully",
        "submitted_at": submission.submitted_at,
        "timestamp": submission.submitted_at,
        "summary": {
            "form_id": submission.form_id,
            "form_version_id": submission.form_version_id,
            "stored_values": len(submission.values or []),
        },
    }

def idempotency_key(request: Request):
    value = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    return value.strip()[:200] if value and value.strip() else None

def existing_idempotent_submission(db, version_id, key):
    if not key: return None
    return db.query(FormSubmission).filter_by(form_version_id=version_id, idempotency_key=key).first()

def validate(snapshot, values):
    errors = {}
    rules = snapshot.get("conditional_rules", [])
    states = evaluate_conditional_rules(snapshot.get("fields", []), rules, values).get("field_states", {})
    cleaned = {}
    for field in snapshot.get("fields", []):
        key, value = str(field["id"]), values.get(str(field["id"]), values.get(field["id"]))
        state = states.get(key, {"visible": True, "required": bool(field.get("required"))})
        if not state.get("visible", True):
            if not is_empty_value(value): errors[key] = "This field is not currently applicable."
            continue
        rules = {r["rule_type"]: r for r in field.get("validation_rules", [])}
        required = bool(state.get("required"))
        empty = is_empty_value(value) or (field.get("field_type") == "checkbox" and value is False)
        if required and empty: errors[key] = rules.get("required", {}).get("error_message") or f'{field["label"]} is required'; continue
        if empty: continue
        text = str(value)
        try:
            if field["field_type"] == "email" or "email" in rules:
                try: validate_email(text, check_deliverability=False)
                except EmailNotValidError: raise ValueError("Enter a valid email address")
            if "min_length" in rules and len(text) < int(rules["min_length"]["rule_value"]): raise ValueError(f'Minimum length is {rules["min_length"]["rule_value"]}')
            if "max_length" in rules and len(text) > int(rules["max_length"]["rule_value"]): raise ValueError(f'Maximum length is {rules["max_length"]["rule_value"]}')
            if "regex" in rules:
                try:
                    if not re.fullmatch(rules["regex"]["rule_value"], text): raise ValueError(rules["regex"].get("error_message") or "Invalid format")
                except re.error:
                    raise ValueError("Invalid regex validation pattern")
            if field["field_type"] == "number":
                number=float(value)
                integer_rule = rules.get("integer")
                decimal_rule = rules.get("decimal")
                integer_enabled = integer_rule and str(integer_rule.get("rule_value", "true")).lower() not in {"false", "0", "no"}
                decimal_enabled = decimal_rule and str(decimal_rule.get("rule_value", "true")).lower() not in {"false", "0", "no"}
                if integer_enabled and not number.is_integer(): raise ValueError("Enter a whole number")
                if decimal_enabled and not re.fullmatch(r"-?\d+(\.\d+)?", text.strip()): raise ValueError("Enter a valid decimal number")
                if "min_value" in rules and number<float(rules["min_value"]["rule_value"]): raise ValueError(f'Minimum value is {rules["min_value"]["rule_value"]}')
                if "max_value" in rules and number>float(rules["max_value"]["rule_value"]): raise ValueError(f'Maximum value is {rules["max_value"]["rule_value"]}')
            if field["field_type"] == "date":
                parsed=date.fromisoformat(text)
                if "min_date" in rules and parsed<date.fromisoformat(rules["min_date"]["rule_value"]): raise ValueError("Date is too early")
                if "max_date" in rules and parsed>date.fromisoformat(rules["max_date"]["rule_value"]): raise ValueError("Date is too late")
            if field["field_type"] == "file":
                validate_file_value(field, value)
            if field["field_type"] == "rating":
                minimum, maximum = rating_bounds(field)
                try: rating = float(value)
                except (TypeError, ValueError): raise ValueError("Please select a rating")
                if rating < minimum or rating > maximum: raise ValueError(f"Rating must be between {minimum} and {maximum}")
            allowed={str(o["option_value"]) for o in field.get("options",[])}
            if allowed:
                selected=value if isinstance(value,list) else [value]
                if any(str(v) not in allowed for v in selected): raise ValueError("Invalid option")
            cleaned[key] = value
        except (ValueError, TypeError) as exc: errors[key] = str(exc)
    if errors: raise HTTPException(422, detail={"message":"Submission validation failed","fields":errors})
    return cleaned

def store_submission(db, link, version, values, request, key=None):
    if key:
        existing = existing_idempotent_submission(db, version.id, key)
        if existing: return existing
    submission=FormSubmission(form_id=link.form_id,form_version_id=version.id,submitter_ip=request.client.host if request.client else None,idempotency_key=key)
    db.add(submission); db.flush()
    known={str(f["id"]) for f in version.snapshot.get("fields",[])}
    for key_name,value in values.items():
        if str(key_name) in known: db.add(SubmissionValue(submission_id=submission.id,field_id=int(key_name),value=json.dumps(value)))
    return submission

def get_public(token:str,db:Session=Depends(get_db)):
    _,version=link_version(token,db); return version.snapshot

def submit_public(token:str,payload:SubmissionCreate,request:Request,db:Session=Depends(get_db)):
    link,version=link_version(token,db)
    key=idempotency_key(request)
    existing=existing_idempotent_submission(db,version.id,key)
    if existing: return submission_response(existing)
    cleaned=validate(version.snapshot,payload.values)
    try:
        submission=store_submission(db,link,version,cleaned,request,key)
        db.commit(); db.refresh(submission); return submission_response(submission)
    except IntegrityError:
        db.rollback()
        existing=existing_idempotent_submission(db,version.id,key)
        if existing: return submission_response(existing)
        raise

async def submit_public_multipart(token:str,request:Request,db:Session=Depends(get_db)):
    link,version=link_version(token,db)
    key=idempotency_key(request)
    existing=existing_idempotent_submission(db,version.id,key)
    if existing: return submission_response(existing)
    form_data = await request.form()
    try: values = json.loads(form_data.get("values") or "{}")
    except json.JSONDecodeError: raise HTTPException(400, "Invalid submission payload")
    snapshot = version.snapshot
    written_files = []
    for field in snapshot.get("fields", []):
        if field.get("field_type") != "file": continue
        upload = form_data.get(f"field_{field['id']}")
        if not upload or not getattr(upload, "filename", ""):
            values.pop(str(field["id"]), None)
            continue
        content = await upload.read()
        original_name = Path(upload.filename).name
        ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        safe_name = f"{uuid.uuid4().hex}.{ext}"
        metadata = {
            "name": original_name,
            "file_name": original_name,
            "type": upload.content_type or "",
            "size": len(content),
            "uploaded_at": datetime.utcnow().isoformat() + "Z",
            "stored_name": safe_name,
            "download_url": f"/forms/{link.form_id}/uploads/{safe_name}",
            "signed_download_url": signed_upload_url(token, link.form_id, safe_name),
        }
        try: validate_file_value(field, metadata)
        except ValueError as exc: raise HTTPException(422, detail={"message":"Submission validation failed","fields":{str(field["id"]):str(exc)}})
        
        from app.services.storage import get_storage
        storage = get_storage()
        safe_name = storage.save(content, original_name, path_prefix=f"form_{link.form_id}")
        
        metadata["stored_name"] = safe_name
        metadata["download_url"] = f"/forms/{link.form_id}/uploads/{safe_name}"
        metadata["signed_download_url"] = signed_upload_url(token, link.form_id, safe_name)
        
        # Keep track of local paths if we need to rollback (for local storage)
        if hasattr(storage, "base_dir"):
            written_files.append(storage.base_dir / f"form_{link.form_id}" / safe_name)
            
        values[str(field["id"])] = metadata
    try:
        cleaned=validate(snapshot, values)
        submission=store_submission(db,link,version,cleaned,request,key)
        db.commit(); db.refresh(submission); return submission_response(submission)
    except HTTPException:
        for path in written_files:
            try: path.unlink(missing_ok=True)
            except OSError: pass
        raise
    except IntegrityError:
        db.rollback()
        existing=existing_idempotent_submission(db,version.id,key)
        if existing: return submission_response(existing)
        raise

def track_form_open(token: str, request: Request, db: Session = Depends(get_db)):
    """
    Day 14: Track when a user opens a form (for completion rate analytics).
    Creates a lightweight pending record with only started_at set (no values yet).
    Returns an open_token the frontend uses to associate the eventual submission.
    """
    link, version = link_version(token, db)
    open_token = str(uuid.uuid4())
    # Use the open_token as idempotency_key so we can update it when submitted
    pending = FormSubmission(
        form_id=link.form_id,
        form_version_id=version.id,
        started_at=datetime.utcnow(),
        submitter_ip=request.client.host if request.client else None,
        idempotency_key=f"__open__{open_token}",
    )
    try:
        db.add(pending)
        db.commit()
        db.refresh(pending)
    except Exception:
        db.rollback()
        pending = None
    return {"open_token": open_token, "tracked": pending is not None}

router.add_api_route("/{token}", get_public, methods=["GET"])
router.add_api_route("/{token}/submit", submit_public, methods=["POST"], status_code=201)
router.add_api_route("/{token}/submit-multipart", submit_public_multipart, methods=["POST"], status_code=201)
router.add_api_route("/{token}/open", track_form_open, methods=["POST"], status_code=200)

def download_public_upload(token: str, stored_name: str, expires: str, signature: str, db: Session = Depends(get_db)):
    link, _ = link_version(token, db)
    safe_name = Path(stored_name).name
    if not verify_upload_signature(token, link.form_id, safe_name, expires, signature):
        raise HTTPException(403, "Invalid or expired download link")
    path = Path(settings.upload_dir) / f"form_{link.form_id}" / safe_name
    if not path.exists() or not path.is_file(): raise HTTPException(404, "Uploaded file not found")
    return FileResponse(path)

router.add_api_route("/{token}/uploads/{stored_name}", download_public_upload, methods=["GET"])
legacy_router.add_api_route("/{token}", get_public, methods=["GET"])
legacy_router.add_api_route("/{token}/submit", submit_public, methods=["POST"], status_code=201)
legacy_router.add_api_route("/{token}/submit-multipart", submit_public_multipart, methods=["POST"], status_code=201)

