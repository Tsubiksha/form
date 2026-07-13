from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.core.dependencies import require_admin
from app.db.database import get_db
from app.models.form import Form
from app.models.submission import FormSubmission
from app.models.user import User, UserRole
from app.schemas.auth import UserStatusRequest

router=APIRouter(prefix="/admin",tags=["Administration"])

@router.get("/users")
def users(page:int=Query(1,ge=1),page_size:int=Query(50,ge=1,le=100),search:str|None=None,role:str|None=None,status_filter:str|None=Query(None,alias="status"),sort:str="desc",admin:User=Depends(require_admin),db:Session=Depends(get_db)):
    query=db.query(User)
    if search: query=query.filter(User.email.ilike(f"%{search}%")|User.name.ilike(f"%{search}%"))
    if role in {"ADMIN","USER"}: query=query.filter(User.role==role)
    if status_filter in {"active","inactive"}: query=query.filter(User.is_active.is_(status_filter=="active"))
    total=query.count();order=User.created_at.asc() if sort=="asc" else User.created_at.desc();items=query.order_by(order).offset((page-1)*page_size).limit(page_size).all();result=[]
    for item in items:
        form_count=db.query(Form).filter(Form.user_id==item.id,Form.is_deleted.is_(False)).count();response_count=db.query(FormSubmission).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==item.id).count()
        result.append({"id":item.id,"name":item.name,"email":item.email,"role":item.role,"is_active":item.is_active,"created_at":item.created_at,"forms_count":form_count,"response_count":response_count})
    return {"items":result,"total":total,"page":page,"page_size":page_size}

@router.patch("/users/{user_id}/status")
def user_status(user_id:int,payload:UserStatusRequest,admin:User=Depends(require_admin),db:Session=Depends(get_db)):
    target=db.get(User,user_id)
    if not target: raise HTTPException(404,"User not found")
    if target.id==admin.id: raise HTTPException(400,"You cannot deactivate your own account")
    if target.role==UserRole.ADMIN: raise HTTPException(403,"The platform administrator cannot be deactivated")
    target.is_active=payload.is_active
    db.add(AuditLog(user_id=admin.id,action="user.activated" if payload.is_active else "user.deactivated",entity_type="user",entity_id=target.id,details={"target_name":target.name,"target_email":target.email}))
    db.commit();db.refresh(target);return target

@router.get("/activity")
def activity_log(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),search:str|None=None,action:str|None=None,sort:str="desc",admin:User=Depends(require_admin),db:Session=Depends(get_db)):
    query=db.query(AuditLog,User.name.label("user_name")).outerjoin(User,AuditLog.user_id==User.id)
    if search:
        term=f"%{search}%"
        query=query.filter(or_(AuditLog.action.ilike(term),AuditLog.entity_type.ilike(term),cast(AuditLog.entity_id,String).ilike(term),User.name.ilike(term)))
    action_filters={"created":"created","updated":"updated","published":"published","deleted":"deleted","archived":"archived","user_activated":"user.activated","user_deactivated":"user.deactivated"}
    if action in action_filters: query=query.filter(AuditLog.action.ilike(f"%{action_filters[action]}%"))
    total=query.count();order=AuditLog.created_at.asc() if sort=="asc" else AuditLog.created_at.desc();rows=query.order_by(order).offset((page-1)*page_size).limit(page_size).all()
    return {"items":[{"id":item.id,"user_id":item.user_id,"user_name":user_name or "System","action":item.action,"entity_type":item.entity_type,"entity_id":item.entity_id,"details":item.details,"created_at":item.created_at} for item,user_name in rows],"total":total,"page":page,"page_size":page_size}

@router.get("/forms")
def forms(page:int=Query(1,ge=1),page_size:int=Query(50,ge=1,le=100),admin:User=Depends(require_admin),db:Session=Depends(get_db)):
    query=db.query(Form).filter(Form.is_deleted.is_(False));total=query.count();items=query.order_by(Form.updated_at.desc()).offset((page-1)*page_size).limit(page_size).all();result=[]
    for item in items:
        result.append({"id":item.id,"title":item.title,"description":item.description,"status":item.status,"user_id":item.user_id,"owner_name":item.owner.name if item.owner else None,"owner_email":item.owner.email if item.owner else None,"updated_at":item.updated_at,"fields_count":len(item.fields),"response_count":db.query(FormSubmission).filter(FormSubmission.form_id==item.id).count()})
    return {"items":result,"total":total,"page":page,"page_size":page_size}
