from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user, require_admin
from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.form import Form
from app.models.share_link import ShareLink
from app.models.submission import FormSubmission, SubmissionValue
from app.models.user import User
from collections import Counter
from datetime import date, datetime, timedelta

router=APIRouter(prefix="/dashboard",tags=["Dashboard"])

@router.get("/me")
def user_dashboard(user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    q=db.query(Form).filter(Form.user_id==user.id,Form.is_deleted.is_(False)); counts=dict(q.with_entities(Form.status,func.count(Form.id)).group_by(Form.status).all())
    response_count=db.query(FormSubmission).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id).count()
    recent_forms=q.order_by(Form.updated_at.desc()).limit(5).all();recent_submissions=db.query(FormSubmission,Form.title).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id).order_by(FormSubmission.submitted_at.desc()).limit(5).all()
    performance=db.query(Form.id,Form.title,Form.status,func.count(FormSubmission.id).label("responses"),func.max(FormSubmission.submitted_at).label("latest_response")).outerjoin(FormSubmission,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id,Form.is_deleted.is_(False)).group_by(Form.id,Form.title,Form.status).order_by(func.count(FormSubmission.id).desc()).first()
    all_forms=q.all()
    response_counts=dict(db.query(FormSubmission.form_id,func.count(FormSubmission.id)).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id).group_by(FormSubmission.form_id).all())
    latest_by_form=dict(db.query(FormSubmission.form_id,func.max(FormSubmission.submitted_at)).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id).group_by(FormSubmission.form_id).all())
    days=[date.today()-timedelta(days=offset) for offset in range(6,-1,-1)]
    days_30=[date.today()-timedelta(days=offset) for offset in range(29,-1,-1)]
    response_dates=Counter(submitted.date() for submitted, in db.query(FormSubmission.submitted_at).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id,FormSubmission.submitted_at>=datetime.combine(days[0],datetime.min.time())).all() if submitted)
    response_dates_30=Counter(submitted.date() for submitted, in db.query(FormSubmission.submitted_at).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id,FormSubmission.submitted_at>=datetime.combine(days_30[0],datetime.min.time())).all() if submitted)
    active_links=db.query(ShareLink).join(Form,ShareLink.form_id==Form.id).filter(Form.user_id==user.id,ShareLink.is_active.is_(True)).count()
    active_link_rows=db.query(ShareLink,Form.title).join(Form,ShareLink.form_id==Form.id).filter(Form.user_id==user.id,ShareLink.is_active.is_(True)).order_by(ShareLink.created_at.desc()).limit(3).all()
    published_forms=[form for form in all_forms if form.status=="published"]
    draft_candidates=[item for item in sorted(all_forms,key=lambda form:form.updated_at or form.created_at,reverse=True) if item.status=="draft"]
    draft_progress=None
    if draft_candidates:
        draft=draft_candidates[0]; field_count=len(draft.fields); required_count=sum(1 for field in draft.fields if field.required); progress=min(100,round((field_count/10)*100)) if field_count else 0
        draft_progress={"id":draft.id,"title":draft.title,"status":draft.status,"updated_at":draft.updated_at,"field_count":field_count,"required_field_count":required_count,"progress":progress}
    week_start=date.today()-timedelta(days=6)
    forms_created_week=sum(1 for form in all_forms if form.created_at and form.created_at.date()>=week_start)
    forms_published_week=sum(1 for form in all_forms if form.status=="published" and form.updated_at and form.updated_at.date()>=week_start)
    files_uploaded_week=db.query(SubmissionValue).join(FormSubmission,SubmissionValue.submission_id==FormSubmission.id).join(Form,FormSubmission.form_id==Form.id).filter(Form.user_id==user.id,FormSubmission.submitted_at>=datetime.combine(week_start,datetime.min.time()),SubmissionValue.value.ilike("%stored_name%")).count()
    return {"total_forms":q.count(),"published_forms":counts.get("published",0),"draft_forms":counts.get("draft",0),"archived_forms":counts.get("archived",0),"total_responses":response_count,
            "recent_forms":[{"id":form.id,"title":form.title,"description":form.description,"status":form.status,"updated_at":form.updated_at,"response_count":db.query(FormSubmission).filter_by(form_id=form.id).count()} for form in recent_forms],
            "recent_responses":[{"id":submission.id,"form_id":submission.form_id,"form_title":title,"submitted_at":submission.submitted_at} for submission,title in recent_submissions],
            "published_forms_list":[{"id":form.id,"title":form.title,"status":form.status,"published_at":form.updated_at,"response_count":response_counts.get(form.id,0),"share_link_status":"active" if active_links else "waiting","latest_submission":latest_by_form.get(form.id)} for form in sorted(published_forms,key=lambda item:item.updated_at or item.created_at,reverse=True)[:5]],
            "response_trend":[{"date":day.strftime("%b %d"),"responses":response_dates.get(day,0)} for day in days],
            "response_trend_30":[{"date":day.strftime("%b %d"),"responses":response_dates_30.get(day,0)} for day in days_30],
            "active_share_links":active_links,
            "active_share_link_items":[{"id":link.id,"form_id":link.form_id,"form_title":title,"status":"Live","responses":response_counts.get(link.form_id,0),"created_at":link.created_at,"share_url":f"/f/{link.link_token}"} for link,title in active_link_rows],
            "responses_this_week":sum(response_dates.values()),
            "weekly_overview":{"forms_created":forms_created_week,"forms_published":forms_published_week,"responses_received":sum(response_dates.values()),"files_uploaded":files_uploaded_week},
            "draft_progress":draft_progress,
            "top_performing_form":({"id":performance.id,"title":performance.title,"status":performance.status,"response_count":performance.responses,"latest_response":performance.latest_response} if performance else None)}

@router.get("/admin")
def admin_dashboard(user:User=Depends(require_admin),db:Session=Depends(get_db)):
    users=db.query(User).all();forms=db.query(Form).filter(Form.is_deleted.is_(False)).all();submissions=db.query(FormSubmission).all();activity=db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(20).all();user_names={item.id:item.name for item in users}
    days=[date.today()-timedelta(days=offset) for offset in range(13,-1,-1)]
    form_dates=Counter(item.created_at.date() for item in forms if item.created_at);response_dates=Counter(item.submitted_at.date() for item in submissions if item.submitted_at)
    role_counts=Counter((item.role.value if hasattr(item.role,"value") else str(item.role)) for item in users);status_counts=Counter(item.status for item in forms)
    week_start=date.today()-timedelta(days=6)
    latest_published=max((item for item in forms if item.status=="published"),key=lambda item:item.updated_at or item.created_at,default=None)
    response_counts=Counter(item.form_id for item in submissions);form_counts=Counter(item.user_id for item in forms)
    creator_rows=[]
    for creator in users:
        creator_forms=[item for item in forms if item.user_id==creator.id]
        creator_rows.append({"id":creator.id,"name":creator.name,"email":creator.email,"forms_count":len(creator_forms),"responses_count":sum(response_counts.get(item.id,0) for item in creator_forms)})
    top_creators=sorted(creator_rows,key=lambda item:(item["forms_count"]+item["responses_count"],item["forms_count"]),reverse=True)[:5]
    stale_cutoff=datetime.utcnow()-timedelta(days=7)
    return {"total_users":len(users),"total_forms":len(forms),"published_forms":status_counts.get("published",0),"response_count":len(submissions),
            "active_users":sum(1 for item in users if item.is_active),"draft_forms":status_counts.get("draft",0),"archived_forms":status_counts.get("archived",0),
            "latest_published_form":({"id":latest_published.id,"title":latest_published.title,"updated_at":latest_published.updated_at} if latest_published else None),
            "users_this_week":sum(1 for item in users if item.created_at and item.created_at.date()>=week_start),
            "forms_this_week":sum(form_dates.get(day,0) for day in days[-7:]),"responses_this_week":sum(response_dates.get(day,0) for day in days[-7:]),
            "platform_status":{"backend":"Operational","database":"Connected","api":"Operational","active_users":sum(1 for item in users if item.is_active),"active_forms":status_counts.get("published",0)},
            "needs_attention":{"stale_drafts":sum(1 for item in forms if item.status=="draft" and item.updated_at and item.updated_at<stale_cutoff),"flagged_forms":0,"deactivated_users":sum(1 for item in users if not item.is_active),"forms_without_responses":sum(1 for item in forms if response_counts.get(item.id,0)==0)},
            "top_creators":top_creators,"recent_registrations":[{"id":item.id,"name":item.name,"email":item.email,"created_at":item.created_at,"is_active":item.is_active} for item in sorted(users,key=lambda item:item.created_at,reverse=True)[:5]],
            "forms_by_status":[{"name":name.title(),"value":status_counts.get(name,0)} for name in ["draft","published","archived"]],
            "users_by_role":[{"name":name,"value":role_counts.get(name,0)} for name in ["USER","ADMIN"]],
            "responses_over_time":[{"date":day.strftime("%b %d"),"responses":response_dates.get(day,0)} for day in days],
            "forms_over_time":[{"date":day.strftime("%b %d"),"forms":form_dates.get(day,0)} for day in days],
            "recent_activity":[{"id":item.id,"user_id":item.user_id,"user_name":user_names.get(item.user_id,"System"),"action":item.action,"entity_type":item.entity_type,"entity_id":item.entity_id,"details":item.details,"created_at":item.created_at} for item in activity]}
