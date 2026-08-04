import csv, io, json, math, re, uuid
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import List, Optional
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import asc, cast, desc, func, or_, String
from sqlalchemy.orm import Session, object_session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.conditional_rule import ConditionalRule
from app.models.field import Field
from app.models.field_option import FieldOption
from app.models.form import Form
from app.models.form_version import FormVersion
from app.models.share_link import ShareLink
from app.models.submission import FormSubmission, SubmissionValue
from app.models.user import User, UserRole
from app.models.validation_rule import ValidationRule
from app.schemas.field import FieldCreate, FieldOptionCreate, FieldOptionUpdate, FieldReorderRequest, OptionReorderRequest, FieldUpdate
from app.schemas.form import FormCreate, FormUpdate
from app.schemas.conditional_rule import ConditionalRuleCreate, ConditionalRuleResponse, ConditionalRuleUpdate
from app.schemas.response import FormResponse
from app.schemas.validation_rule import ValidationRuleCreate, ValidationRuleUpdate

router = APIRouter(prefix="/forms", tags=["Forms"])
OPTION_FIELD_TYPES = {"dropdown", "radio", "multi_select", "checkbox_group"}
SUPPORTED_FILE_EXTENSIONS = {"pdf", "docx", "png", "jpg", "jpeg"}
EMPTY_CONDITION_OPERATORS = {"is_empty", "is_not_empty"}
CONDITIONAL_OPERATORS_BY_FIELD_TYPE = {
    "text": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "email": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "textarea": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "number": {"equals", "not_equals", "greater_than", "less_than", "in", "not_in", "is_empty", "is_not_empty"},
    "date": {"equals", "not_equals", "greater_than", "less_than", "in", "not_in", "is_empty", "is_not_empty"},
    "rating": {"equals", "not_equals", "greater_than", "less_than", "in", "not_in", "is_empty", "is_not_empty"},
    "checkbox": {"equals", "not_equals", "in", "not_in", "is_empty", "is_not_empty"},
    "dropdown": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "radio": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "multi_select": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "checkbox_group": {"equals", "not_equals", "contains", "in", "not_in", "is_empty", "is_not_empty"},
    "file": {"is_empty", "is_not_empty"},
}

def audit(db, user, action, kind, entity_id, details=None):
    db.add(AuditLog(user_id=user.id, action=action, entity_type=kind, entity_id=entity_id, details=details or {}))

def owned_form(db: Session, form_id: int, user: User, include_deleted=False) -> Form:
    form = db.get(Form, form_id)
    if not form or (form.is_deleted and not include_deleted): raise HTTPException(404, "Form not found")
    if user.role != UserRole.ADMIN and form.user_id != user.id: raise HTTPException(403, "You do not have access to this form")
    return form

def field_for(db, form_id, field_id, user):
    owned_form(db, form_id, user)
    field = db.query(Field).filter(Field.id == field_id, Field.form_id == form_id).first()
    if not field: raise HTTPException(404, "Field not found")
    return field

def conditional_rule_for(db, form_id, rule_id, user):
    owned_form(db, form_id, user)
    rule = db.query(ConditionalRule).filter_by(id=rule_id, form_id=form_id).first()
    if not rule: raise HTTPException(404, "Conditional rule not found")
    return rule

def normalize_comparison(operator, comparison_value):
    if operator in EMPTY_CONDITION_OPERATORS: return None
    return comparison_value.strip() if isinstance(comparison_value, str) else comparison_value

def validate_conditional_payload(db: Session, form: Form, payload, existing_rule_id: int | None = None):
    trigger = db.query(Field).filter_by(id=payload.trigger_field_id, form_id=form.id).first()
    target = db.query(Field).filter_by(id=payload.target_field_id, form_id=form.id).first()
    if not trigger: raise HTTPException(422, detail={"message":"Trigger field must belong to this form","fields":{"trigger_field_id":"Invalid trigger field"}})
    if not target: raise HTTPException(422, detail={"message":"Target field must belong to this form","fields":{"target_field_id":"Invalid target field"}})
    if trigger.id == target.id: raise HTTPException(422, detail={"message":"Trigger and target fields must be different","fields":{"target_field_id":"Choose a different target field"}})
    allowed = CONDITIONAL_OPERATORS_BY_FIELD_TYPE.get(trigger.field_type, EMPTY_CONDITION_OPERATORS)
    if payload.operator not in allowed:
        raise HTTPException(422, detail={"message":"Operator is not valid for the trigger field type","fields":{"operator":f"{payload.operator} cannot be used with {trigger.field_type}"}})
    comparison_value = normalize_comparison(payload.operator, payload.comparison_value)
    if payload.operator not in EMPTY_CONDITION_OPERATORS and (comparison_value is None or str(comparison_value) == ""):
        raise HTTPException(422, detail={"message":"Comparison value is required","fields":{"comparison_value":"Enter a comparison value"}})
    duplicate = db.query(ConditionalRule).filter(
        ConditionalRule.form_id == form.id,
        ConditionalRule.trigger_field_id == trigger.id,
        ConditionalRule.operator == payload.operator,
        ConditionalRule.comparison_value.is_(None) if comparison_value is None else ConditionalRule.comparison_value == comparison_value,
        ConditionalRule.target_field_id == target.id,
        ConditionalRule.action == payload.action,
    )
    if existing_rule_id is not None: duplicate = duplicate.filter(ConditionalRule.id != existing_rule_id)
    if duplicate.first(): raise HTTPException(409, "An identical conditional rule already exists")
    return trigger, target, comparison_value

def snapshot(form: Form) -> dict:
    return {"id": form.id, "title": form.title, "description": form.description, "fields": [
        {"id": f.id, "label": f.label, "field_type": f.field_type, "required": f.required, "placeholder": f.placeholder,
         "help_text": f.help_text, "display_order": f.display_order,
         "options": [{"id": o.id, "option_label": o.option_label, "option_value": o.option_value, "display_order": o.display_order} for o in f.options],
         "validation_rules": [{"id": r.id, "rule_type": r.rule_type, "rule_value": r.rule_value, "error_message": r.error_message} for r in f.validation_rules]}
        for f in form.fields],
        "conditional_rules": [
            {"id": r.id, "form_id": r.form_id, "trigger_field_id": r.trigger_field_id, "operator": r.operator,
             "comparison_value": r.comparison_value, "target_field_id": r.target_field_id, "action": r.action,
             "created_at": r.created_at.isoformat() if r.created_at else None, "updated_at": r.updated_at.isoformat() if r.updated_at else None}
            for r in db_session_query_rules(form)
        ]}

def canonical_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text if text != "" else None

def canonical_snapshot(data: dict) -> dict:
    fields = sorted(data.get("fields", []), key=lambda item: (item.get("display_order") or 0, item.get("id") or 0))
    field_index = {field.get("id"): index + 1 for index, field in enumerate(fields)}
    canonical_fields = []
    for index, field in enumerate(fields, start=1):
        options = sorted(field.get("options", []), key=lambda item: (item.get("display_order") or 0, item.get("id") or 0))
        rules = sorted(field.get("validation_rules", []), key=lambda item: (item.get("rule_type") or "", canonical_text(item.get("rule_value")) or "", canonical_text(item.get("error_message")) or ""))
        canonical_fields.append({
            "label": canonical_text(field.get("label")),
            "field_type": canonical_text(field.get("field_type")),
            "required": bool(field.get("required")),
            "display_order": index,
            "placeholder": canonical_text(field.get("placeholder")),
            "help_text": canonical_text(field.get("help_text")),
            "options": [
                {
                    "option_label": canonical_text(option.get("option_label")),
                    "option_value": canonical_text(option.get("option_value")),
                    "display_order": option_index,
                }
                for option_index, option in enumerate(options, start=1)
            ],
            "validation_rules": [
                {
                    "rule_type": canonical_text(rule.get("rule_type")),
                    "rule_value": canonical_text(rule.get("rule_value")),
                    "error_message": canonical_text(rule.get("error_message")),
                }
                for rule in rules
            ],
        })
    conditional_rules = []
    for rule in data.get("conditional_rules", []):
        trigger = field_index.get(rule.get("trigger_field_id"))
        target = field_index.get(rule.get("target_field_id"))
        if not trigger or not target:
            continue
        conditional_rules.append({
            "trigger_field": trigger,
            "operator": canonical_text(rule.get("operator")),
            "comparison_value": canonical_text(rule.get("comparison_value")),
            "target_field": target,
            "action": canonical_text(rule.get("action")),
        })
    conditional_rules.sort(key=lambda item: (item["trigger_field"], item["operator"] or "", item["comparison_value"] or "", item["target_field"], item["action"] or ""))
    return {
        "title": canonical_text(data.get("title")),
        "description": canonical_text(data.get("description")),
        "fields": canonical_fields,
        "conditional_rules": conditional_rules,
    }

def db_session_query_rules(form: Form):
    session = object_session(form)
    if not session:
        return []
    valid_ids = {field.id for field in form.fields}
    return session.query(ConditionalRule).filter(
        ConditionalRule.form_id == form.id,
        ConditionalRule.trigger_field_id.in_(valid_ids),
        ConditionalRule.target_field_id.in_(valid_ids),
    ).order_by(ConditionalRule.id.asc()).all()

def cleanup_orphaned_conditional_rules(db: Session, form: Form):
    valid_ids = {field.id for field in form.fields}
    rules = db.query(ConditionalRule).filter_by(form_id=form.id).all()
    orphaned = [rule for rule in rules if rule.trigger_field_id not in valid_ids or rule.target_field_id not in valid_ids]
    orphaned_ids = {rule.id for rule in orphaned}
    for rule in orphaned:
        db.delete(rule)
    if orphaned:
        db.commit()
    return [rule for rule in rules if rule.id not in orphaned_ids]

def mark_draft(form):
    if form.status == "published": form.status = "draft"

def validate_publishable(form: Form):
    errors = {}
    if not form.title or not form.title.strip(): errors["title"] = "Form title is required"
    if not form.fields: errors["fields"] = "Add at least one field before publishing"
    for field in form.fields:
        key = f"field_{field.id}"
        if not field.label or not field.label.strip(): errors[key] = "Field label is required"
        if field.field_type in OPTION_FIELD_TYPES and not field.options: errors[key] = f"{field.label} needs at least one option"
        regex_rule = next((r.rule_value for r in field.validation_rules if r.rule_type == "regex" and r.rule_value), None)
        if regex_rule:
            try: re.compile(regex_rule)
            except re.error: errors[key] = f"{field.label} has an invalid regex pattern"
        if field.field_type == "file":
            rules = {r.rule_type: r.rule_value for r in field.validation_rules}
            if rules.get("file_size"):
                try:
                    if float(rules["file_size"]) <= 0: raise ValueError()
                except (TypeError, ValueError): errors[key] = f"{field.label} maximum file size must be a positive MB value"
            if rules.get("allowed_file_types"):
                allowed = {x.strip().lower().lstrip(".") for x in rules["allowed_file_types"].split(",") if x.strip()}
                invalid = allowed - SUPPORTED_FILE_EXTENSIONS
                if invalid: errors[key] = f"{field.label} has unsupported file types: {', '.join(sorted(invalid))}"
        if field.field_type == "rating":
            rules = {r.rule_type: r.rule_value for r in field.validation_rules}
            try:
                minimum = int(float(rules.get("min_value") or 1))
                maximum = int(float(rules.get("max_value") or 5))
                if minimum < 0 or maximum <= minimum: raise ValueError()
            except (TypeError, ValueError):
                errors[key] = f"{field.label} rating scale must have a valid minimum and maximum"
            if rules.get("rating_style") and str(rules["rating_style"]).lower() not in {"stars", "numbers"}:
                errors[key] = f"{field.label} rating style must be Stars or Numbers"
    if errors: raise HTTPException(422, detail={"message":"Fix form issues before publishing","fields":errors})

def display_value(value):
    if isinstance(value, dict) and value.get("stored_name"):
        return f"{value.get('name') or value.get('file_name') or 'Uploaded file'} ({value.get('download_url')})"
    return value

def version_fields(version: FormVersion | None):
    if not version: return []
    return sorted((version.snapshot or {}).get("fields", []), key=lambda item: item.get("display_order") or 0)

def version_field_lookup(version: FormVersion | None):
    return {field.get("id"): field for field in version_fields(version)}

def version_response_counts(db: Session, form_id: int):
    rows = db.query(FormSubmission.form_version_id, func.count(FormSubmission.id)).filter_by(form_id=form_id).group_by(FormSubmission.form_version_id).all()
    return {version_id: count for version_id, count in rows}

def form_versions_payload(db: Session, form_id: int):
    counts = version_response_counts(db, form_id)
    versions = db.query(FormVersion).filter_by(form_id=form_id).order_by(FormVersion.version_number.desc()).all()
    return [{
        "id": version.id,
        "form_id": version.form_id,
        "version_number": version.version_number,
        "status": version.status,
        "created_at": version.created_at,
        "published_at": version.created_at,
        "field_count": len(version_fields(version)),
        "response_count": counts.get(version.id, 0),
    } for version in versions]

def file_upload_count(submissions):
    count = 0
    for submission in submissions:
        for value in submission.values:
            try:
                parsed = json.loads(value.value) if value.value else None
            except Exception:
                parsed = None
            if isinstance(parsed, dict) and parsed.get("stored_name"):
                count += 1
    return count

def version_compare_summary(version: FormVersion, submissions):
    fields = version_fields(version)
    return {
        "id": version.id,
        "version_number": version.version_number,
        "published_at": version.created_at,
        "field_count": len(fields),
        "response_count": len(submissions),
        "latest_submission": max((item.submitted_at for item in submissions), default=None),
        "files_uploaded": file_upload_count(submissions),
        "average_completion_time": max(1, math.ceil(len(fields) * 0.35)),
    }

def comparable_rules(field):
    return sorted([
        {"rule_type": item.get("rule_type"), "rule_value": item.get("rule_value"), "error_message": item.get("error_message")}
        for item in field.get("validation_rules", [])
    ], key=lambda item: item.get("rule_type") or "")

def comparable_options(field):
    return sorted([
        {"label": item.get("option_label"), "value": item.get("option_value"), "display_order": item.get("display_order")}
        for item in field.get("options", [])
    ], key=lambda item: (item.get("display_order") or 0, item.get("label") or ""))

def compare_version_fields(base: FormVersion, target: FormVersion):
    base_fields = {field.get("id"): field for field in version_fields(base)}
    target_fields = {field.get("id"): field for field in version_fields(target)}
    base_ids, target_ids = set(base_fields), set(target_fields)
    added = [target_fields[field_id] for field_id in target_ids - base_ids]
    removed = [base_fields[field_id] for field_id in base_ids - target_ids]
    changed = []
    for field_id in sorted(base_ids & target_ids):
        before, after = base_fields[field_id], target_fields[field_id]
        changes = []
        for key, label in [("label", "Label"), ("field_type", "Field type"), ("required", "Required status")]:
            if before.get(key) != after.get(key):
                changes.append({"type": key, "label": label, "before": before.get(key), "after": after.get(key)})
        if comparable_rules(before) != comparable_rules(after):
            changes.append({"type": "validation", "label": "Validation", "before": comparable_rules(before), "after": comparable_rules(after)})
        if comparable_options(before) != comparable_options(after):
            changes.append({"type": "options", "label": "Options", "before": comparable_options(before), "after": comparable_options(after)})
        if changes:
            changed.append({"field_id": field_id, "label": after.get("label") or before.get("label"), "changes": changes})
    return {
        "added": [{"field_id": item.get("id"), "label": item.get("label"), "field_type": item.get("field_type")} for item in added],
        "removed": [{"field_id": item.get("id"), "label": item.get("label"), "field_type": item.get("field_type")} for item in removed],
        "changed": changed,
    }

def latest_published_version(db: Session, form_id: int):
    return db.query(FormVersion).filter_by(form_id=form_id, status="published").order_by(FormVersion.version_number.desc()).first()

def submission_values(submission: FormSubmission):
    return {value.field_id: (json.loads(value.value) if value.value else None) for value in submission.values}

def serialize_submission(submission: FormSubmission, version: FormVersion | None = None):
    fields = version_field_lookup(version)
    return {
        "id": submission.id,
        "form_id": submission.form_id,
        "form_version_id": submission.form_version_id,
        "version_number": version.version_number if version else None,
        "submitted_at": submission.submitted_at,
        "submitter_ip": submission.submitter_ip,
        "status": "submitted",
        "values": [{
            "field_id": value.field_id,
            "field_label": fields.get(value.field_id, {}).get("label"),
            "field_type": fields.get(value.field_id, {}).get("field_type"),
            "field_config": fields.get(value.field_id),
            "value": json.loads(value.value) if value.value else None,
        } for value in submission.values],
    }

def version_specific_rows(version: FormVersion, submissions):
    fields = version_fields(version)
    rows = []
    for submission in submissions:
        values = submission_values(submission)
        rows.append([submission.id, version.version_number, submission.submitted_at.isoformat()] + [display_value(values.get(field.get("id"), "")) for field in fields])
    return fields, rows

def all_versions_rows(db: Session, form_id: int, submissions):
    versions = {version.id: version for version in db.query(FormVersion).filter_by(form_id=form_id).all()}
    rows = []
    for submission in submissions:
        version = versions.get(submission.form_version_id)
        fields = version_field_lookup(version)
        answers = {}
        for value in submission.values:
            raw = json.loads(value.value) if value.value else None
            label = fields.get(value.field_id, {}).get("label") or f"Field {value.field_id}"
            answers[label] = display_value(raw)
        rows.append([submission.id, version.version_number if version else "Legacy", submission.submitted_at.isoformat(), json.dumps(answers, ensure_ascii=False)])
    return rows

@router.post("/", response_model=FormResponse, status_code=201)
def create_form(payload: FormCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role == UserRole.ADMIN: raise HTTPException(403, "Platform administrators cannot create user forms")
    form = Form(title=payload.title.strip(), description=payload.description, user_id=user.id, created_by=user.id, updated_by=user.id)
    db.add(form); db.flush(); audit(db, user, "form.created", "form", form.id); db.commit(); db.refresh(form); return form

@router.get("/")
def get_forms(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), search: str | None = None,
              status_filter: str | None = Query(None, alias="status"), sort: str = "updated_at", order: str = "desc",
              db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Form).filter(Form.is_deleted.is_(False))
    if user.role != UserRole.ADMIN: query = query.filter(Form.user_id == user.id)
    if search: query = query.filter(or_(Form.title.ilike(f"%{search}%"), Form.description.ilike(f"%{search}%")))
    if status_filter: query = query.filter(Form.status == status_filter)
    total = query.count(); column = getattr(Form, sort, Form.updated_at); query = query.order_by(desc(column) if order == "desc" else asc(column))
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    # Keep the original array contract for default calls; opt-in pagination returns metadata.
    if page == 1 and page_size == 20 and not search and not status_filter and sort == "updated_at" and order == "desc": return items
    return {"items": [{**FormResponse.model_validate(x).model_dump(),"response_count":db.query(FormSubmission).filter_by(form_id=x.id).count(),"latest_submission":db.query(func.max(FormSubmission.submitted_at)).filter_by(form_id=x.id).scalar()} for x in items], "total": total, "page": page, "page_size": page_size, "pages": math.ceil(total/page_size)}

@router.get("/{form_id}", response_model=FormResponse)
def get_form(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)): return owned_form(db, form_id, user)

@router.patch("/{form_id}", response_model=FormResponse)
def update_form(form_id: int, payload: FormUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user); data = payload.model_dump(exclude_unset=True)
    if "title" in data: data["title"] = data["title"].strip()
    for key, value in data.items(): setattr(form, key, value)
    form.updated_by = user.id; mark_draft(form); audit(db, user, "form.updated", "form", form.id, data); db.commit(); db.refresh(form); return form

@router.delete("/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user); form.is_deleted = True; form.updated_by = user.id; audit(db, user, "form.deleted", "form", form.id); db.commit(); return None

@router.post("/{form_id}/rules", response_model=ConditionalRuleResponse, status_code=status.HTTP_201_CREATED)
def create_conditional_rule(form_id: int, payload: ConditionalRuleCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user)
    _, _, comparison_value = validate_conditional_payload(db, form, payload)
    rule = ConditionalRule(
        form_id=form.id,
        trigger_field_id=payload.trigger_field_id,
        operator=payload.operator,
        comparison_value=comparison_value,
        target_field_id=payload.target_field_id,
        action=payload.action,
    )
    db.add(rule); mark_draft(form); db.commit(); db.refresh(rule); return rule

@router.get("/{form_id}/rules", response_model=list[ConditionalRuleResponse])
def get_conditional_rules(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user)
    cleanup_orphaned_conditional_rules(db, form)
    return db.query(ConditionalRule).filter_by(form_id=form_id).order_by(ConditionalRule.created_at.desc(), ConditionalRule.id.desc()).all()

@router.patch("/{form_id}/rules/{rule_id}", response_model=ConditionalRuleResponse)
def update_conditional_rule(form_id: int, rule_id: int, payload: ConditionalRuleUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rule = conditional_rule_for(db, form_id, rule_id, user)
    form = owned_form(db, form_id, user)
    merged = ConditionalRuleCreate(
        trigger_field_id=payload.trigger_field_id if payload.trigger_field_id is not None else rule.trigger_field_id,
        operator=payload.operator if payload.operator is not None else rule.operator,
        comparison_value=payload.comparison_value if "comparison_value" in payload.model_fields_set else rule.comparison_value,
        target_field_id=payload.target_field_id if payload.target_field_id is not None else rule.target_field_id,
        action=payload.action if payload.action is not None else rule.action,
    )
    _, _, comparison_value = validate_conditional_payload(db, form, merged, existing_rule_id=rule.id)
    rule.trigger_field_id = merged.trigger_field_id
    rule.operator = merged.operator
    rule.comparison_value = comparison_value
    rule.target_field_id = merged.target_field_id
    rule.action = merged.action
    rule.updated_at = datetime.utcnow()
    mark_draft(form); db.commit(); db.refresh(rule); return rule

@router.delete("/{form_id}/rules/{rule_id}", status_code=204)
def delete_conditional_rule(form_id: int, rule_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rule = conditional_rule_for(db, form_id, rule_id, user)
    form = owned_form(db, form_id, user)
    mark_draft(form); db.delete(rule); db.commit(); return None

@router.post("/{form_id}/fields", status_code=201)
def add_field(form_id: int, payload: FieldCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user); field = Field(form_id=form.id, **payload.model_dump()); db.add(field); mark_draft(form); db.commit(); db.refresh(field); return field

@router.get("/{form_id}/fields")
def get_fields(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)): return owned_form(db, form_id, user).fields

@router.patch("/{form_id}/fields/reorder")
def reorder_fields(form_id: int, payload: FieldReorderRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user); existing = {f.id: f for f in form.fields}
    if set(x.field_id for x in payload.fields) != set(existing): raise HTTPException(400, "Reorder request must include every field exactly once")
    for item in payload.fields: existing[item.field_id].display_order = item.display_order
    mark_draft(form); db.commit(); return {"message": "Fields reordered successfully"}

@router.patch("/{form_id}/fields/{field_id}")
def update_field(form_id: int, field_id: int, payload: FieldUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = field_for(db, form_id, field_id, user)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items(): setattr(field, key, value)
    mark_draft(field.form); db.commit(); db.refresh(field); return field

@router.delete("/{form_id}/fields/{field_id}")
def delete_field(form_id: int, field_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = field_for(db, form_id, field_id, user)
    dependent_rules = db.query(ConditionalRule).filter(
        ConditionalRule.form_id == form_id,
        or_(ConditionalRule.trigger_field_id == field_id, ConditionalRule.target_field_id == field_id),
    ).all()
    deleted_rule_count = len(dependent_rules)
    mark_draft(field.form)
    for rule in dependent_rules:
        db.delete(rule)
    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully", "deleted_rule_count": deleted_rule_count}

@router.post("/{form_id}/fields/{field_id}/options", status_code=201)
def add_option(form_id: int, field_id: int, payload: FieldOptionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = field_for(db, form_id, field_id, user)
    if field.field_type not in {"dropdown", "radio", "multi_select", "checkbox_group"}: raise HTTPException(400, "This field type does not support options")
    option = FieldOption(field_id=field.id, **payload.model_dump()); db.add(option); mark_draft(field.form); db.commit(); db.refresh(option); return option

@router.patch("/{form_id}/fields/{field_id}/options/reorder")
def reorder_options(form_id: int, field_id: int, payload: OptionReorderRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = field_for(db, form_id, field_id, user); existing = {o.id:o for o in field.options}
    if set(i.option_id for i in payload.options) != set(existing): raise HTTPException(400, "Reorder request must include every option")
    for item in payload.options: existing[item.option_id].display_order = item.display_order
    mark_draft(field.form); db.commit(); return {"message":"Options reordered successfully"}

@router.patch("/{form_id}/fields/{field_id}/options/{option_id}")
def update_option(form_id: int, field_id: int, option_id: int, payload: FieldOptionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = field_for(db, form_id, field_id, user); option = db.query(FieldOption).filter_by(id=option_id, field_id=field.id).first()
    if not option: raise HTTPException(404, "Option not found")
    for k,v in payload.model_dump(exclude_unset=True).items(): setattr(option,k,v)
    mark_draft(field.form); db.commit(); db.refresh(option); return option

@router.delete("/{form_id}/fields/{field_id}/options/{option_id}", status_code=204)
def delete_option(form_id: int, field_id: int, option_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = field_for(db, form_id, field_id, user); option = db.query(FieldOption).filter_by(id=option_id, field_id=field.id).first()
    if not option: raise HTTPException(404, "Option not found")
    mark_draft(field.form); db.delete(option); db.commit(); return None

# Legacy validation URLs are retained, and ownership is now inferred through the field.
@router.post("/fields/{field_id}/validation-rules", status_code=201)
def add_rule(field_id: int, payload: ValidationRuleCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = db.get(Field, field_id)
    if not field: raise HTTPException(404, "Field not found")
    owned_form(db, field.form_id, user); rule = ValidationRule(field_id=field.id, **payload.model_dump()); db.add(rule); mark_draft(field.form); db.commit(); db.refresh(rule); return rule

@router.get("/fields/{field_id}/validation-rules")
def get_rules(field_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = db.get(Field, field_id)
    if not field: raise HTTPException(404, "Field not found")
    owned_form(db, field.form_id, user); return field.validation_rules

@router.patch("/fields/{field_id}/validation-rules/{rule_id}")
def update_rule(field_id: int, rule_id: int, payload: ValidationRuleUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = db.get(Field, field_id)
    if not field: raise HTTPException(404, "Field not found")
    owned_form(db, field.form_id, user); rule = db.query(ValidationRule).filter_by(id=rule_id, field_id=field_id).first()
    if not rule: raise HTTPException(404, "Validation rule not found")
    for k,v in payload.model_dump(exclude_unset=True).items(): setattr(rule,k,v)
    mark_draft(field.form); db.commit(); db.refresh(rule); return rule

@router.delete("/fields/{field_id}/validation-rules/{rule_id}", status_code=204)
def delete_rule(field_id: int, rule_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    field = db.get(Field, field_id)
    if not field: raise HTTPException(404, "Field not found")
    owned_form(db, field.form_id, user); rule = db.query(ValidationRule).filter_by(id=rule_id, field_id=field_id).first()
    if not rule: raise HTTPException(404, "Validation rule not found")
    mark_draft(field.form); db.delete(rule); db.commit(); return None

@router.post("/{form_id}/publish", status_code=201)
def publish(form_id: int, response: Response, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user)
    validate_publishable(form)
    draft_snapshot = snapshot(form)
    latest_published = db.query(FormVersion).filter_by(form_id=form.id, status="published").order_by(FormVersion.version_number.desc()).first()
    latest = db.query(FormVersion).filter_by(form_id=form.id).order_by(FormVersion.version_number.desc()).first()
    if latest_published and canonical_snapshot(draft_snapshot) == canonical_snapshot(latest_published.snapshot or {}):
        response.status_code = 200
        return {"published": False, "unchanged": True, "message": "No changes to publish. This form is already up to date.", "form_id": form.id, "version_id": latest_published.id, "version_number": latest_published.version_number, "status": latest_published.status}
    version = FormVersion(form_id=form.id, version_number=(latest.version_number + 1 if latest else 1), status="published", snapshot=draft_snapshot)
    form.status = "published"; db.add(version); db.flush(); audit(db,user,"form.published","form",form.id,{"version":version.version_number}); db.commit(); db.refresh(version)
    return {"published": True, "unchanged": False, "message":"Form published successfully","form_id":form.id,"version_id":version.id,"version_number":version.version_number,"status":version.status}

@router.get("/{form_id}/preview")
def preview(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user)
    validate_publishable(form)
    data = snapshot(form)
    data["status"] = form.status
    data["preview"] = True
    return data

@router.post("/{form_id}/archive")
def archive(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user); latest = db.query(FormVersion).filter_by(form_id=form.id, status="published").order_by(FormVersion.version_number.desc()).first()
    if not latest: raise HTTPException(409, "No published version found")
    latest.status = "archived"; form.status = "archived"; db.commit(); return {"message":"Form archived successfully","form_id":form.id,"version_number":latest.version_number,"status":latest.status}

@router.post("/{form_id}/restore")
def restore(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user); latest = db.query(FormVersion).filter_by(form_id=form.id, status="archived").order_by(FormVersion.version_number.desc()).first()
    if not latest: raise HTTPException(409, "No archived version found")
    latest.status = "published"; form.status = "published"; audit(db,user,"form.restored","form",form.id,{"version":latest.version_number}); db.commit(); return {"message":"Form restored successfully","form_id":form.id,"version_number":latest.version_number,"status":latest.status}

@router.get("/{form_id}/versions")
def versions(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned_form(db, form_id, user); return form_versions_payload(db, form_id)

@router.get("/{form_id}/versions/compare")
def compare_versions(form_id: int, base_version_id: int = Query(...), target_version_id: int = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned_form(db, form_id, user)
    if base_version_id == target_version_id:
        raise HTTPException(400, "Choose two different versions to compare")
    base = db.query(FormVersion).filter_by(id=base_version_id, form_id=form_id).first()
    target = db.query(FormVersion).filter_by(id=target_version_id, form_id=form_id).first()
    if not base or not target:
        raise HTTPException(404, "Form version not found")
    if base.status != "published" or target.status != "published":
        raise HTTPException(409, "Only published versions can be compared")
    base_submissions = db.query(FormSubmission).filter_by(form_id=form_id, form_version_id=base.id).all()
    target_submissions = db.query(FormSubmission).filter_by(form_id=form_id, form_version_id=target.id).all()
    return {
        "base": version_compare_summary(base, base_submissions),
        "target": version_compare_summary(target, target_submissions),
        "changes": compare_version_fields(base, target),
    }

@router.post("/{form_id}/generate-link", status_code=201)
def generate_link(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned_form(db, form_id, user); version = db.query(FormVersion).filter_by(form_id=form_id,status="published").order_by(FormVersion.version_number.desc()).first()
    if not version: raise HTTPException(409, "No published version found")
    link = ShareLink(form_id=form_id, form_version_id=version.id, link_token=str(uuid.uuid4())); db.add(link); db.commit(); db.refresh(link)
    return {"message":"Shareable link generated","form_id":form_id,"form_version_id":version.id,"link_token":link.link_token,"share_url":f"/f/{link.link_token}"}

@router.get("/{form_id}/responses")
def responses(
    form_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    version_id: int | None = Query(None),
    search: str | None = Query(None, description="Search by response ID or field value"),
    date_from: str | None = Query(None, description="ISO date string YYYY-MM-DD"),
    date_to: str | None = Query(None, description="ISO date string YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    form = owned_form(db, form_id, user)
    selected_version = None
    if version_id:
        selected_version = db.query(FormVersion).filter_by(id=version_id, form_id=form_id).first()
        if not selected_version: raise HTTPException(404, "Form version not found")
    q = db.query(FormSubmission).filter(FormSubmission.form_id == form_id, FormSubmission.is_archived.is_(False))
    if version_id: q = q.filter(FormSubmission.form_version_id == version_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                cast(FormSubmission.id, String).ilike(term),
                FormSubmission.id.in_(
                    db.query(SubmissionValue.submission_id)
                    .filter(SubmissionValue.value.ilike(term))
                    .filter(SubmissionValue.submission_id.in_(db.query(FormSubmission.id).filter(FormSubmission.form_id == form_id)))
                )
            )
        )
    if date_from:
        try:
            q = q.filter(FormSubmission.submitted_at >= datetime.fromisoformat(date_from))
        except ValueError:
            raise HTTPException(400, "Invalid date_from format. Use YYYY-MM-DD.")
    if date_to:
        try:
            q = q.filter(FormSubmission.submitted_at < datetime.fromisoformat(date_to) + timedelta(days=1))
        except ValueError:
            raise HTTPException(400, "Invalid date_to format. Use YYYY-MM-DD.")
    q = q.order_by(FormSubmission.submitted_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    current_version = latest_published_version(db, form_id)
    version_map = {version.id: version for version in db.query(FormVersion).filter_by(form_id=form_id).all()}
    return {
        "form": {"id": form.id, "title": form.title, "status": form.status},
        "items": [serialize_submission(s, selected_version or version_map.get(s.form_version_id)) for s in items],
        "versions": form_versions_payload(db, form_id),
        "selected_version_id": version_id,
        "current_version_id": current_version.id if current_version else None,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }

@router.get("/{form_id}/responses/export.csv")
@router.get("/{form_id}/responses/export/csv")
def export_responses(form_id:int, version_id:int|None=Query(None), db:Session=Depends(get_db), user:User=Depends(get_current_user)):
    owned_form(db,form_id,user); out=io.StringIO(); writer=csv.writer(out); q=db.query(FormSubmission).filter_by(form_id=form_id).order_by(FormSubmission.submitted_at); filename=f"form-{form_id}-responses.csv"
    if version_id:
        version=db.query(FormVersion).filter_by(id=version_id,form_id=form_id).first()
        if not version: raise HTTPException(404, "Form version not found")
        fields,rows=version_specific_rows(version,q.filter(FormSubmission.form_version_id==version_id).all())
        writer.writerow(["Response ID","Version Number","Submitted At"]+[field.get("label") for field in fields])
        for row in rows: writer.writerow(row)
        filename=f"form-{form_id}-version-{version.version_number}-responses.csv"
    else:
        writer.writerow(["Response ID","Version Number","Submitted At","Answers"])
        for row in all_versions_rows(db,form_id,q.all()): writer.writerow(row)
    return Response(out.getvalue(),media_type="text/csv",headers={"Content-Disposition":f'attachment; filename="{filename}"'})

def response_rows(form, submissions):
    fields=list(form.fields); rows=[]
    for submission in submissions:
        values={v.field_id:(json.loads(v.value) if v.value else None) for v in submission.values}
        rows.append([submission.id,submission.submitted_at.isoformat()]+[display_value(values.get(field.id,"")) for field in fields])
    return fields,rows

@router.get("/{form_id}/responses/export/excel")
def export_excel(form_id:int,version_id:int|None=Query(None),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    owned_form(db,form_id,user); q=db.query(FormSubmission).filter_by(form_id=form_id).order_by(FormSubmission.submitted_at); workbook=Workbook(); sheet=workbook.active; sheet.title="Responses"; filename=f"form-{form_id}-responses.xlsx"
    if version_id:
        version=db.query(FormVersion).filter_by(id=version_id,form_id=form_id).first()
        if not version: raise HTTPException(404, "Form version not found")
        fields,rows=version_specific_rows(version,q.filter(FormSubmission.form_version_id==version_id).all())
        sheet.append(["Response ID","Version Number","Submitted At"]+[field.get("label") for field in fields])
        filename=f"form-{form_id}-version-{version.version_number}-responses.xlsx"
        for row in rows: sheet.append([json.dumps(v) if isinstance(v,(list,dict)) else v for v in row])
    else:
        sheet.title="Summary"; sheet.append(["Version Number","Published At","Field Count","Response Count"])
        versions=db.query(FormVersion).filter_by(form_id=form_id).order_by(FormVersion.version_number.desc()).all()
        for version in versions:
            submissions=q.filter(FormSubmission.form_version_id==version.id).all()
            fields,rows=version_specific_rows(version,submissions)
            sheet.append([version.version_number,version.created_at.isoformat() if version.created_at else "",len(fields),len(rows)])
            version_sheet=workbook.create_sheet(title=f"Version {version.version_number}"[:31])
            version_sheet.append(["Response ID","Version Number","Submitted At"]+[field.get("label") for field in fields])
            for row in rows: version_sheet.append([json.dumps(v) if isinstance(v,(list,dict)) else v for v in row])
        filename=f"form-{form_id}-all-versions-responses.xlsx"
    for worksheet in workbook.worksheets:
        worksheet.freeze_panes="A2"; worksheet.auto_filter.ref=worksheet.dimensions
        for column in worksheet.columns: worksheet.column_dimensions[column[0].column_letter].width=min(max(len(str(cell.value or "")) for cell in column)+2,40)
    output=io.BytesIO(); workbook.save(output)
    return Response(output.getvalue(),media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",headers={"Content-Disposition":f'attachment; filename="{filename}"'})

@router.get("/{form_id}/responses/export/pdf")
def export_pdf(form_id:int,version_id:int|None=Query(None),db:Session=Depends(get_db),user:User=Depends(get_current_user)):
    if version_id:
        form=owned_form(db,form_id,user); version=db.query(FormVersion).filter_by(id=version_id,form_id=form_id).first()
        if not version: raise HTTPException(404, "Form version not found")
        submissions=db.query(FormSubmission).filter_by(form_id=form_id,form_version_id=version_id).order_by(FormSubmission.submitted_at).all()
        fields,rows=version_specific_rows(version,submissions); output=io.BytesIO(); pdf=canvas.Canvas(output,pagesize=A4); width,height=A4
        def version_header():
            pdf.setFont("Helvetica-Bold",18);pdf.drawString(42,height-48,form.title);pdf.setFont("Helvetica",9);pdf.drawString(42,height-66,f"Version {version.version_number} - {len(rows)} submissions - Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
        version_header(); y=height-96
        for row in rows:
            if y<110: pdf.showPage();version_header();y=height-96
            pdf.setFont("Helvetica-Bold",11);pdf.drawString(42,y,f"Response #{row[0]} - {row[2]}");y-=18;pdf.setFont("Helvetica",9)
            for field,value in zip(fields,row[3:]):
                max_rating=next((rule.get("rule_value") for rule in field.get("validation_rules",[]) if rule.get("rule_type")=="max_value"),"5")
                suffix=f" / {max_rating}" if field.get("field_type")=="rating" and value not in ("",None) else ""
                text=f"{field.get('label')}: {json.dumps(value) if isinstance(value,(list,dict)) else value}{suffix}"[:110]
                pdf.drawString(54,y,text);y-=14
            y-=10
        pdf.save(); return Response(output.getvalue(),media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="form-{form_id}-version-{version.version_number}-responses.pdf"'})
    form=owned_form(db,form_id,user); rows=all_versions_rows(db,form_id,db.query(FormSubmission).filter_by(form_id=form_id).order_by(FormSubmission.submitted_at).all()); output=io.BytesIO(); pdf=canvas.Canvas(output,pagesize=A4); width,height=A4
    def summary_header():
        pdf.setFont("Helvetica-Bold",18);pdf.drawString(42,height-48,form.title);pdf.setFont("Helvetica",9);pdf.drawString(42,height-66,f"All versions summary - {len(rows)} submissions - Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    summary_header(); y=height-96
    for row in rows:
        if y<110: pdf.showPage();summary_header();y=height-96
        pdf.setFont("Helvetica-Bold",11);pdf.drawString(42,y,f"Response #{row[0]} - Version {row[1]} - {row[2]}");y-=18;pdf.setFont("Helvetica",9)
        pdf.drawString(54,y,str(row[3])[:110]);y-=24
    pdf.save(); return Response(output.getvalue(),media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="form-{form_id}-responses.pdf"'})
    def header():
        pdf.setFont("Helvetica-Bold",18);pdf.drawString(42,height-48,form.title);pdf.setFont("Helvetica",9);pdf.drawString(42,height-66,f"Response report · {len(rows)} submissions · Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    header(); y=height-96
    for row in rows:
        if y<110: pdf.showPage();header();y=height-96
        pdf.setFont("Helvetica-Bold",11);pdf.drawString(42,y,f"Response #{row[0]} · {row[1]}");y-=18;pdf.setFont("Helvetica",9)
        for field,value in zip(fields,row[2:]):
            text=f"{field.label}: {json.dumps(value) if isinstance(value,(list,dict)) else value}"[:110]
            pdf.drawString(54,y,text);y-=14
        y-=10
    pdf.save(); return Response(output.getvalue(),media_type="application/pdf",headers={"Content-Disposition":f'attachment; filename="form-{form_id}-responses.pdf"'})

@router.get("/{form_id}/responses/{response_id}")
def response_detail(form_id: int, response_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    form = owned_form(db, form_id, user)
    s = db.query(FormSubmission).filter_by(id=response_id, form_id=form_id).first()
    if not s: raise HTTPException(404, "Response not found")
    version = db.get(FormVersion, s.form_version_id)
    payload = serialize_submission(s, version)
    payload.update({
        "form_name": (version.snapshot.get("title") if version else None) or form.title,
        "version_number": version.version_number if version else None,
        "started_at": s.started_at,
        "completion_time_seconds": int((s.submitted_at - s.started_at).total_seconds()) if s.started_at else None,
    })
    return payload


@router.get("/{form_id}/uploads/{stored_name}")
def download_upload(form_id: int, stored_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned_form(db, form_id, user)
    safe_name = Path(stored_name).name
    path = Path(settings.upload_dir) / f"form_{form_id}" / safe_name
    if not path.exists() or not path.is_file(): raise HTTPException(404, "Uploaded file not found")
    return FileResponse(path)


# ─────────────────────────────────────────────────────────────────────────────
# Day 14 — Per-form Analytics
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{form_id}/analytics")
def form_analytics(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return per-form analytics: submission counts, completion rate, avg time, field stats, trend."""
    form = owned_form(db, form_id, user)
    current_version = latest_published_version(db, form_id)

    # Total submissions (non-archived)
    all_submissions = (
        db.query(FormSubmission)
        .filter(FormSubmission.form_id == form_id, FormSubmission.is_archived.is_(False))
        .order_by(FormSubmission.submitted_at.desc())
        .all()
    )
    total_submissions = len(all_submissions)

    # Average completion time (only where started_at is set)
    timed = [s for s in all_submissions if s.started_at]
    avg_time_seconds = None
    if timed:
        total_secs = sum(int((s.submitted_at - s.started_at).total_seconds()) for s in timed if s.submitted_at > s.started_at)
        avg_time_seconds = round(total_secs / len(timed)) if timed else None

    # Completion rate (timed submissions that completed vs those that opened)
    total_opens = db.query(func.count(FormSubmission.id)).filter(
        FormSubmission.form_id == form_id, FormSubmission.started_at.isnot(None)
    ).scalar() or 0
    completion_rate = round(total_submissions / total_opens * 100, 1) if total_opens > 0 else None

    # Submissions by day (last 30 days)
    from collections import Counter
    cutoff = datetime.utcnow() - timedelta(days=30)
    recent = [s for s in all_submissions if s.submitted_at and s.submitted_at >= cutoff]
    date_counts = Counter(s.submitted_at.date() for s in recent)
    days_30 = [date.today() - timedelta(days=i) for i in range(29, -1, -1)]
    submissions_by_day = [{"date": d.strftime("%b %d"), "submissions": date_counts.get(d, 0)} for d in days_30]

    # Latest submissions (5)
    version_map = {v.id: v for v in db.query(FormVersion).filter_by(form_id=form_id).all()}
    latest_submissions = [
        {
            "id": s.id,
            "submitted_at": s.submitted_at,
            "version_number": version_map.get(s.form_version_id, None) and version_map[s.form_version_id].version_number,
            "completion_time_seconds": int((s.submitted_at - s.started_at).total_seconds()) if s.started_at else None,
        }
        for s in all_submissions[:5]
    ]

    # Per-field statistics (using current version snapshot)
    field_stats = []
    if current_version and current_version.snapshot:
        fields = current_version.snapshot.get("fields", [])
        version_submissions = [s for s in all_submissions if s.form_version_id == current_version.id]
        for field in fields:
            fid = field.get("id")
            ftype = field.get("field_type", "")
            responses_for_field = []
            null_count = 0
            for sub in version_submissions:
                val_obj = next((v for v in sub.values if v.field_id == fid), None)
                if val_obj and val_obj.value:
                    try:
                        parsed = json.loads(val_obj.value)
                    except Exception:
                        parsed = val_obj.value
                    responses_for_field.append(parsed)
                else:
                    null_count += 1
            distribution = {}
            if ftype in {"dropdown", "radio", "multi_select", "checkbox_group"}:
                dist_counter = Counter()
                for v in responses_for_field:
                    if isinstance(v, list):
                        for item in v:
                            dist_counter[str(item)] += 1
                    else:
                        dist_counter[str(v)] += 1
                distribution = dict(dist_counter.most_common(20))
            elif ftype == "rating":
                dist_counter = Counter()
                for v in responses_for_field:
                    try:
                        dist_counter[str(int(float(v)))] += 1
                    except (TypeError, ValueError):
                        pass
                distribution = dict(dist_counter)
            field_stats.append({
                "field_id": fid,
                "label": field.get("label"),
                "field_type": ftype,
                "response_count": len(responses_for_field),
                "null_count": null_count,
                "distribution": distribution,
            })

    return {
        "form_id": form_id,
        "form_title": form.title,
        "total_submissions": total_submissions,
        "total_opens": total_opens,
        "completion_rate": completion_rate,
        "avg_completion_time_seconds": avg_time_seconds,
        "submissions_by_day": submissions_by_day,
        "latest_submissions": latest_submissions,
        "field_stats": field_stats,
        "current_version_id": current_version.id if current_version else None,
        "current_version_number": current_version.version_number if current_version else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Day 15 — Unified Export (JSON + streaming CSV)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{form_id}/export")
def export_form_responses(
    form_id: int,
    format: str = Query("csv", description="Export format: csv, json, excel, pdf"),
    version_id: int | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Unified export endpoint supporting csv, json, excel, pdf formats."""
    owned_form(db, form_id, user)
    fmt = format.lower()
    if fmt == "csv":
        if version_id:
            version = db.query(FormVersion).filter_by(id=version_id, form_id=form_id).first()
            if not version: raise HTTPException(404, "Form version not found")
            submissions = db.query(FormSubmission).filter_by(form_id=form_id, form_version_id=version_id).order_by(FormSubmission.submitted_at).all()
            fields, rows = version_specific_rows(version, submissions)

            def generate_csv():
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(["Response ID", "Version Number", "Submitted At"] + [f.get("label") for f in fields])
                output.seek(0); yield output.read(); output.seek(0); output.truncate(0)
                for row in rows:
                    writer.writerow(row)
                    output.seek(0); yield output.read(); output.seek(0); output.truncate(0)

            return StreamingResponse(
                generate_csv(),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="form-{form_id}-v{version.version_number}-export.csv"'},
            )
        else:
            submissions = db.query(FormSubmission).filter_by(form_id=form_id).order_by(FormSubmission.submitted_at).all()

            def generate_all_csv():
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(["Response ID", "Version Number", "Submitted At", "Answers"])
                output.seek(0); yield output.read(); output.seek(0); output.truncate(0)
                for row in all_versions_rows(db, form_id, submissions):
                    writer.writerow(row)
                    output.seek(0); yield output.read(); output.seek(0); output.truncate(0)

            return StreamingResponse(
                generate_all_csv(),
                media_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="form-{form_id}-export.csv"'},
            )
    elif fmt == "json":
        q = db.query(FormSubmission).filter_by(form_id=form_id).order_by(FormSubmission.submitted_at)
        if version_id: q = q.filter(FormSubmission.form_version_id == version_id)
        submissions = q.all()
        version_map = {v.id: v for v in db.query(FormVersion).filter_by(form_id=form_id).all()}
        result = []
        for s in submissions:
            v = version_map.get(s.form_version_id)
            fields = version_field_lookup(v)
            result.append({
                "id": s.id,
                "form_id": s.form_id,
                "form_version_id": s.form_version_id,
                "version_number": v.version_number if v else None,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "completion_time_seconds": int((s.submitted_at - s.started_at).total_seconds()) if s.started_at else None,
                "values": [
                    {
                        "field_id": val.field_id,
                        "field_label": fields.get(val.field_id, {}).get("label"),
                        "field_type": fields.get(val.field_id, {}).get("field_type"),
                        "value": json.loads(val.value) if val.value else None,
                    }
                    for val in s.values
                ],
            })
        content = json.dumps(result, ensure_ascii=False, indent=2, default=str)
        return Response(
            content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="form-{form_id}-export.json"'},
        )
    elif fmt in ("excel", "xlsx"):
        return export_excel(form_id, version_id, db, user)
    elif fmt == "pdf":
        return export_pdf(form_id, version_id, db, user)
    else:
        raise HTTPException(400, f"Unsupported export format: {fmt}. Use csv, json, excel, or pdf.")


# ─────────────────────────────────────────────────────────────────────────────
# Day 18 — Duplicate Form
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{form_id}/duplicate", status_code=201)
def duplicate_form(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Duplicate a form with all fields, options, validation rules and conditional rules. Does NOT copy submissions."""
    if user.role == UserRole.ADMIN:
        raise HTTPException(403, "Platform administrators cannot duplicate user forms")
    source = owned_form(db, form_id, user)

    # 1. Create new form
    new_form = Form(
        title=f"{source.title} (Copy)",
        description=source.description,
        user_id=user.id,
        created_by=user.id,
        updated_by=user.id,
        status="draft",
    )
    db.add(new_form)
    db.flush()

    # 2. Duplicate fields + options + validation rules, tracking old→new field ID mapping
    old_to_new_field_id: dict[int, int] = {}
    for old_field in sorted(source.fields, key=lambda f: f.display_order):
        new_field = Field(
            form_id=new_form.id,
            label=old_field.label,
            field_type=old_field.field_type,
            required=old_field.required,
            placeholder=old_field.placeholder,
            help_text=old_field.help_text,
            display_order=old_field.display_order,
        )
        db.add(new_field)
        db.flush()
        old_to_new_field_id[old_field.id] = new_field.id

        for opt in old_field.options:
            db.add(FieldOption(
                field_id=new_field.id,
                option_label=opt.option_label,
                option_value=opt.option_value,
                display_order=opt.display_order,
            ))
        for rule in old_field.validation_rules:
            db.add(ValidationRule(
                field_id=new_field.id,
                rule_type=rule.rule_type,
                rule_value=rule.rule_value,
                error_message=rule.error_message,
            ))

    # 3. Duplicate conditional rules using new field IDs
    old_rules = db.query(ConditionalRule).filter_by(form_id=source.id).all()
    for rule in old_rules:
        new_trigger = old_to_new_field_id.get(rule.trigger_field_id)
        new_target = old_to_new_field_id.get(rule.target_field_id)
        if new_trigger and new_target:
            db.add(ConditionalRule(
                form_id=new_form.id,
                trigger_field_id=new_trigger,
                operator=rule.operator,
                comparison_value=rule.comparison_value,
                target_field_id=new_target,
                action=rule.action,
            ))

    audit(db, user, "form.duplicated", "form", new_form.id, {"source_form_id": source.id})
    db.commit()
    db.refresh(new_form)
    return {
        "message": "Form duplicated successfully",
        "form_id": new_form.id,
        "title": new_form.title,
        "field_count": len(new_form.fields),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Day 19 — Bulk Delete + Retention
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{form_id}/responses/bulk-delete", status_code=200)
def bulk_delete_responses(
    form_id: int,
    response_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Permanently delete a list of responses by ID. Requires ownership of the form."""
    form = owned_form(db, form_id, user)
    if not response_ids:
        raise HTTPException(400, "Provide at least one response ID to delete")
    if len(response_ids) > 500:
        raise HTTPException(400, "Maximum 500 responses can be deleted at once")
    deleted = 0
    for rid in response_ids:
        s = db.query(FormSubmission).filter_by(id=rid, form_id=form_id).first()
        if s:
            db.delete(s)
            deleted += 1
    audit(db, user, "responses.bulk_deleted", "form", form.id, {"deleted_count": deleted, "requested_ids": response_ids})
    db.commit()
    return {"message": f"{deleted} response(s) deleted successfully", "deleted_count": deleted}


@router.get("/{form_id}/responses/retention")
def get_retention(form_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return the count of responses eligible for archiving (older than a given threshold)."""
    owned_form(db, form_id, user)
    for_30 = db.query(FormSubmission).filter(
        FormSubmission.form_id == form_id,
        FormSubmission.submitted_at < datetime.utcnow() - timedelta(days=30),
        FormSubmission.is_archived.is_(False),
    ).count()
    for_90 = db.query(FormSubmission).filter(
        FormSubmission.form_id == form_id,
        FormSubmission.submitted_at < datetime.utcnow() - timedelta(days=90),
        FormSubmission.is_archived.is_(False),
    ).count()
    return {
        "form_id": form_id,
        "eligible_30_days": for_30,
        "eligible_90_days": for_90,
        "message": "Responses older than the threshold can be archived or deleted.",
    }


@router.post("/{form_id}/responses/retention")
def apply_retention(
    form_id: int,
    older_than_days: int = Body(..., embed=True),
    action: str = Body("archive", embed=True),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Archive or delete responses older than older_than_days days."""
    form = owned_form(db, form_id, user)
    if older_than_days < 1:
        raise HTTPException(400, "older_than_days must be at least 1")
    if action not in ("archive", "delete"):
        raise HTTPException(400, "action must be 'archive' or 'delete'")
    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    q = db.query(FormSubmission).filter(
        FormSubmission.form_id == form_id,
        FormSubmission.submitted_at < cutoff,
        FormSubmission.is_archived.is_(False),
    )
    affected = q.all()
    count = len(affected)
    now = datetime.utcnow()
    if action == "archive":
        for s in affected:
            s.is_archived = True
            s.archived_at = now
        audit(db, user, "responses.archived", "form", form.id, {"archived_count": count, "older_than_days": older_than_days})
        db.commit()
        return {"message": f"{count} response(s) archived", "affected_count": count, "action": "archive"}
    else:
        for s in affected:
            db.delete(s)
        audit(db, user, "responses.deleted_by_retention", "form", form.id, {"deleted_count": count, "older_than_days": older_than_days})
        db.commit()
        return {"message": f"{count} response(s) permanently deleted", "affected_count": count, "action": "delete"}
@router.get("/{form_id}/exports")
def list_form_exports(form_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    owned_form(db, form_id, current_user)
    from app.models.export_job import ExportJob
    jobs = db.query(ExportJob).filter(ExportJob.form_id == form_id).order_by(desc(ExportJob.created_at)).all()
    return [{
        "id": job.id,
        "form_id": job.form_id,
        "format": job.format,
        "status": job.status,
        "file_url": job.file_url,
        "created_at": job.created_at,
        "completed_at": job.completed_at
    } for job in jobs]

@router.get("/exports/history")
def list_all_exports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.export_job import ExportJob
    query = db.query(ExportJob, Form.title.label("form_title"))\
              .join(Form, Form.id == ExportJob.form_id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(Form.user_id == current_user.id)
    
    jobs = query.order_by(desc(ExportJob.created_at)).all()
    return [{
        "id": job.ExportJob.id,
        "form_title": job.form_title,
        "format": job.ExportJob.format,
        "status": job.ExportJob.status,
        "file_url": job.ExportJob.file_url,
        "created_at": job.ExportJob.created_at,
        "completed_at": job.ExportJob.completed_at
    } for job in jobs]
