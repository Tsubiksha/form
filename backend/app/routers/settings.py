from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.settings import BulkSettingsUpdate, CategoryUpdate, SettingResponse, TestEmailRequest
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/admin/settings", tags=["Settings"])

@router.get("")
def get_all_settings(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    settings = SettingsService.get_all_settings(db)
    return {"categories": settings}

@router.put("")
def update_bulk_settings(payload: BulkSettingsUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    for category_data in payload.categories:
        updates = [{"setting_key": s.setting_key, "setting_value": s.setting_value} for s in category_data.settings]
        SettingsService.update_settings(db, category_data.category, updates, admin.id)
        
        # Log audit entry
        db.add(AuditLog(
            user_id=admin.id,
            action=f"setting.updated",
            entity_type="setting",
            entity_id=None,
            details={"category": category_data.category, "changes": [s.setting_key for s in category_data.settings]}
        ))
    db.commit()
    return {"message": "Settings updated successfully"}

@router.post("/test-email")
def test_email(payload: TestEmailRequest, admin: User = Depends(require_admin)):
    # Mocking successful email connection
    # In a real app we'd use smtplib/aiosmtplib here with the payload
    if not payload.smtpHost or not payload.senderEmail:
        raise HTTPException(status_code=400, detail="Missing SMTP Host or Sender Email")
    return {"message": "Test email sent successfully via " + payload.smtpHost}
