import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.database import Base, engine
from app.models import audit_log, field, field_option, form, form_version, share_link, submission, user, validation_rule
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.forms import router as forms_router
from app.routers.public import legacy_router, router as public_router
from app.routers.admin import router as admin_router
from app.services.admin_seed import seed_admin
from app.db.database import SessionLocal

@asynccontextmanager
async def lifespan(application: FastAPI):
    if __import__("os").getenv("TESTING", "false").lower() != "true":
        db=SessionLocal()
        try: seed_admin(db)
        finally: db.close()
    yield

app=FastAPI(title="Low-Code Dynamic Form Platform",version="2.0.0",lifespan=lifespan)
if __import__("os").getenv("AUTO_CREATE_TABLES","false").lower()=="true": Base.metadata.create_all(bind=engine)
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173","http://localhost:5174","http://127.0.0.1:5173","http://127.0.0.1:5174"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

@app.exception_handler(HTTPException)
async def http_error(request:Request,exc:HTTPException):
    detail=exc.detail; message=detail if isinstance(detail,str) else detail.get("message","Request failed")
    details=None if isinstance(detail,str) else detail
    return JSONResponse(status_code=exc.status_code,content={"success":False,"message":message,"errors":details or {},"error":{"code":f"HTTP_{exc.status_code}","message":message,"details":details}},headers=exc.headers)

@app.exception_handler(RequestValidationError)
async def validation_error(request:Request,exc:RequestValidationError):
    errors={".".join(str(x) for x in item["loc"][1:]):item["msg"].replace("Value error, ","") for item in exc.errors()}
    message=next(iter(errors.values()),"Request validation failed")
    return JSONResponse(status_code=422,content={"success":False,"message":message,"errors":errors,"error":{"code":"VALIDATION_ERROR","message":message,"details":errors}})

@app.exception_handler(Exception)
async def server_error(request:Request,exc:Exception):
    request_id=str(uuid.uuid4()); logging.exception("Unhandled error %s",request_id)
    return JSONResponse(status_code=500,content={"success":False,"message":"Something went wrong. Please try again later.","errors":{},"error":{"code":"INTERNAL_ERROR","message":"Something went wrong. Please try again later.","details":{"request_id":request_id}}})

app.include_router(auth_router); app.include_router(public_router); app.include_router(legacy_router); app.include_router(forms_router); app.include_router(dashboard_router); app.include_router(admin_router)

@app.get("/")
def root(): return {"message":"Backend Running Successfully"}
@app.get("/health")
def health(): return {"status":"healthy"}
@app.get("/field-types")
def field_types(): return [{"type":t,"label":l} for t,l in [("text","Text"),("number","Number"),("email","Email"),("textarea","Textarea"),("dropdown","Dropdown"),("radio","Radio"),("multi_select","Multi Select"),("checkbox_group","Checkbox Group"),("checkbox","Checkbox"),("date","Date"),("file","File Upload"),("rating","Rating")]]
