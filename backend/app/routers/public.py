import json, re, uuid
from datetime import date, datetime
from pathlib import Path
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.form_version import FormVersion
from app.models.share_link import ShareLink
from app.models.submission import FormSubmission, SubmissionValue
from app.schemas.submission import SubmissionCreate

router = APIRouter(prefix="/public/forms", tags=["Public Forms"])
legacy_router = APIRouter(prefix="/forms/public/forms", tags=["Public Forms"])

def link_version(token, db):
    link = db.query(ShareLink).filter_by(link_token=token, is_active=True).first()
    if not link: raise HTTPException(404, "Invalid or inactive share link")
    version = db.get(FormVersion, link.form_version_id)
    if not version or version.status != "published": raise HTTPException(410, "This form version is no longer available")
    return link, version

SUPPORTED_FILE_EXTENSIONS = {"pdf", "docx", "png", "jpg", "jpeg"}

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

def validate(snapshot, values):
    errors = {}
    for field in snapshot.get("fields", []):
        key, value = str(field["id"]), values.get(str(field["id"]), values.get(field["id"]))
        rules = {r["rule_type"]: r for r in field.get("validation_rules", [])}
        required = field.get("required") or "required" in rules
        empty = value is None or value == "" or value == [] or value is False
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
        except (ValueError, TypeError) as exc: errors[key] = str(exc)
    if errors: raise HTTPException(422, detail={"message":"Submission validation failed","fields":errors})

def get_public(token:str,db:Session=Depends(get_db)):
    _,version=link_version(token,db); return version.snapshot

def submit_public(token:str,payload:SubmissionCreate,request:Request,db:Session=Depends(get_db)):
    link,version=link_version(token,db); validate(version.snapshot,payload.values)
    submission=FormSubmission(form_id=link.form_id,form_version_id=version.id,submitter_ip=request.client.host if request.client else None); db.add(submission); db.flush()
    known={str(f["id"]) for f in version.snapshot.get("fields",[])}
    for key,value in payload.values.items():
        if str(key) in known: db.add(SubmissionValue(submission_id=submission.id,field_id=int(key),value=json.dumps(value)))
    db.commit(); db.refresh(submission); return {"id":submission.id,"message":"Response submitted successfully","submitted_at":submission.submitted_at}

async def submit_public_multipart(token:str,request:Request,db:Session=Depends(get_db)):
    link,version=link_version(token,db)
    form_data = await request.form()
    try: values = json.loads(form_data.get("values") or "{}")
    except json.JSONDecodeError: raise HTTPException(400, "Invalid submission payload")
    snapshot = version.snapshot
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
        }
        try: validate_file_value(field, metadata)
        except ValueError as exc: raise HTTPException(422, detail={"message":"Submission validation failed","fields":{str(field["id"]):str(exc)}})
        directory = Path(settings.upload_dir) / f"form_{link.form_id}"
        directory.mkdir(parents=True, exist_ok=True)
        (directory / safe_name).write_bytes(content)
        values[str(field["id"])] = metadata
    validate(snapshot, values)
    submission=FormSubmission(form_id=link.form_id,form_version_id=version.id,submitter_ip=request.client.host if request.client else None); db.add(submission); db.flush()
    known={str(f["id"]) for f in snapshot.get("fields",[])}
    for key,value in values.items():
        if str(key) in known: db.add(SubmissionValue(submission_id=submission.id,field_id=int(key),value=json.dumps(value)))
    db.commit(); db.refresh(submission); return {"id":submission.id,"message":"Response submitted successfully","submitted_at":submission.submitted_at}

router.add_api_route("/{token}",get_public,methods=["GET"])
router.add_api_route("/{token}/submit",submit_public,methods=["POST"],status_code=201)
router.add_api_route("/{token}/submit-multipart",submit_public_multipart,methods=["POST"],status_code=201)
legacy_router.add_api_route("/{token}",get_public,methods=["GET"])
legacy_router.add_api_route("/{token}/submit",submit_public,methods=["POST"],status_code=201)
legacy_router.add_api_route("/{token}/submit-multipart",submit_public_multipart,methods=["POST"],status_code=201)
