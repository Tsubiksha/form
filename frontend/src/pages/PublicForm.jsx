import {Fragment,useEffect,useMemo,useRef,useState} from "react";
import {useParams} from "react-router-dom";
import {CheckCircle2,LockKeyhole,RefreshCcw,UploadCloud,X} from "lucide-react";
import API from "../services/api";
import {evaluateConditionalRules,isEmptyValue as baseEmptyValue} from "../utils/conditionalLogic";

const labels={pdf:"PDF",docx:"DOCX",png:"PNG",jpg:"JPG",jpeg:"JPEG"};
const optionTypes=new Set(["dropdown","radio","multi_select","checkbox_group"]);

export function fileConfig(field){
  const rules=Object.fromEntries((field.validation_rules||[]).map(rule=>[rule.rule_type,rule.rule_value]));
  const allowed=(rules.allowed_file_types||"pdf,docx,png,jpg,jpeg").split(",").map(item=>item.trim().toLowerCase().replace(".","")).filter(Boolean);
  return {allowed,maxSize:rules.file_size||""};
}

function ratingConfig(field){
  const rules=Object.fromEntries((field.validation_rules||[]).map(rule=>[rule.rule_type,rule.rule_value]));
  const min=Number.parseInt(rules.min_value||"1",10)||1;
  const max=Math.max(min,Number.parseInt(rules.max_value||"5",10)||5);
  return {min,max,style:(rules.rating_style||"stars").toLowerCase()==="numbers"?"numbers":"stars",lowLabel:rules.low_label||"",highLabel:rules.high_label||""};
}

function formatSize(bytes=0){if(!bytes)return "";if(bytes<1024*1024)return `${Math.round(bytes/1024)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`}
function completionTime(fields=[]){return Math.max(1,Math.ceil((fields.length||1)*0.35))}
function requiredMessage(field){return field.field_type==="rating"?"Please select a rating.":`${field.label} is required.`}
function isEmptyValue(value,field){if(field.field_type==="checkbox")return value!==true;if(Array.isArray(value))return value.length===0;return baseEmptyValue(value)}
function isCompleteValue(value,field){return !isEmptyValue(value,field)}
function validationRules(field){return Object.fromEntries((field.validation_rules||[]).map(rule=>[rule.rule_type,rule]))}
function sectionFor(field){
  const text=`${field.label||""} ${field.help_text||""}`.toLowerCase();
  if(field.field_type==="file")return "Attachments";
  if(field.field_type==="textarea"||text.includes("comment")||text.includes("message"))return "Additional Comments";
  if(["rating","radio","dropdown","multi_select","checkbox_group","checkbox"].includes(field.field_type))return "Feedback";
  if(["email","number","date","text"].includes(field.field_type)||text.includes("name")||text.includes("phone"))return "Personal Information";
  return "Form Details";
}
function withState(field,fieldStates){return {...field,required:!!(fieldStates[String(field.id)]?.required??field.required)}}
function visible(field,fieldStates){return fieldStates[String(field.id)]?.visible!==false}

function RatingInput({field,value,onChange}){
  const {min,max,style,lowLabel,highLabel}=ratingConfig(field);
  const values=Array.from({length:max-min+1},(_,index)=>min+index);
  const current=Number(value)||0;
  return <div className={`public-rating ${style}`} role="radiogroup" aria-label={field.label}>
    <div className="public-rating-options">{values.map(item=><button key={item} type="button" role="radio" aria-checked={current===item} aria-label={`${item} out of ${max}`} className={current>=item?"selected":""} onClick={()=>onChange(item)} onKeyDown={event=>{if(event.key==="ArrowRight"||event.key==="ArrowUp"){event.preventDefault();onChange(Math.min(max,(current||min)+1))}if(event.key==="ArrowLeft"||event.key==="ArrowDown"){event.preventDefault();onChange(Math.max(min,(current||min)-1))}}}>{style==="stars"?"\u2605":item}</button>)}</div>
    {(lowLabel||highLabel)&&<div className="rating-labels"><span>{lowLabel}</span><span>{highLabel}</span></div>}
  </div>;
}

function CompactFileUploadInput({field,value,onChange}){
  const {allowed,maxSize}=fileConfig(field);
  const inputRef=useRef(null);
  const clear=()=>{if(inputRef.current)inputRef.current.value="";onChange(null)};
  const choose=file=>{if(file)onChange(file)};
  const onDrop=event=>{event.preventDefault();choose(event.dataTransfer.files?.[0])};
  return <div className={`public-upload-zone compact ${value?.name?"has-file":""}`}>
    <input ref={inputRef} id={`field-${field.id}`} type="file" required={field.required} accept={allowed.map(type=>`.${type}`).join(",")} onChange={event=>onChange(event.target.files?.[0]||null)}/>
    {!value?.name?<div className="compact-upload-row" onDragOver={event=>event.preventDefault()} onDrop={onDrop} onClick={()=>inputRef.current?.click()}><button type="button" className="button secondary" onClick={event=>{event.stopPropagation();inputRef.current?.click()}}>Choose File</button><span>No file selected · drop file here</span></div>:<div className="selected-file-card compact"><CheckCircle2/><div><strong>{value.name}</strong><small>{formatSize(value.size)||"Selected file"}</small></div><button type="button" className="button secondary" onClick={()=>inputRef.current?.click()}>Change File</button><button type="button" className="remove-file-button" onClick={clear} aria-label="Remove selected file"><X/></button></div>}
    <small>Allowed: {allowed.map(type=>labels[type]||type.toUpperCase()).join(", ")}{maxSize?` · Maximum: ${maxSize} MB`:""}</small>
  </div>;
}

export function FieldInput({field,value,onChange,error}) {
  const describedBy=[field.help_text?`field-${field.id}-help`:null,error?`field-${field.id}-error`:null].filter(Boolean).join(" ")||undefined;
  const common={id:`field-${field.id}`,value:value??"",required:field.required,"aria-required":field.required||undefined,"aria-invalid":!!error,"aria-describedby":describedBy,onChange:event=>onChange(field.field_type==="checkbox"?event.target.checked:event.target.value)};
  if(field.field_type==="textarea")return <textarea {...common} rows="5" placeholder={field.placeholder||""}/>;
  if(field.field_type==="checkbox")return <label className={`public-choice single ${value?"selected":""}`}><input id={common.id} type="checkbox" checked={!!value} required={field.required} aria-required={field.required||undefined} aria-invalid={!!error} aria-describedby={describedBy} onChange={event=>onChange(event.target.checked)}/><span>{field.placeholder||"Yes, I agree"}</span></label>;
  if(field.field_type==="dropdown")return <select {...common}><option value="">Select an option</option>{(field.options||[]).map(option=><option key={option.id} value={option.option_value}>{option.option_label}</option>)}</select>;
  if(field.field_type==="radio")return <div className="public-choice-group" role="radiogroup" aria-describedby={describedBy}>{(field.options||[]).map(option=><label className={`public-choice ${value===option.option_value?"selected":""}`} key={option.id}><input type="radio" name={`field-${field.id}`} value={option.option_value} checked={value===option.option_value} onChange={event=>onChange(event.target.value)}/><span>{option.option_label}</span></label>)}</div>;
  if(["multi_select","checkbox_group"].includes(field.field_type))return <div className="public-choice-group checkbox-grid" aria-describedby={describedBy}>{(field.options||[]).map(option=><label className={`public-choice ${(value||[]).includes(option.option_value)?"selected":""}`} key={option.id}><input type="checkbox" checked={(value||[]).includes(option.option_value)} onChange={event=>onChange(event.target.checked?[...(value||[]),option.option_value]:(value||[]).filter(item=>item!==option.option_value))}/><span>{option.option_label}</span></label>)}</div>;
  if(field.field_type==="rating")return <RatingInput field={field} value={value} onChange={onChange}/>;
  if(field.field_type==="file")return <CompactFileUploadInput field={field} value={value} onChange={onChange}/>;
  return <input {...common} type={["email","number","date"].includes(field.field_type)?field.field_type:"text"} placeholder={field.placeholder||""}/>;
}

export function PublicFormBody({form,values,setValues,errors={},preview=false,onSubmit,message,busy=false,onFieldChange,fieldStates={},uploadProgress=0}) {
  const fields=form.fields||[];
  const states=useMemo(()=>Object.keys(fieldStates).length?fieldStates:evaluateConditionalRules(fields,form.conditional_rules||[],values).field_states,[fields,form.conditional_rules,values,fieldStates]);
  const visibleFields=fields.filter(field=>visible(field,states));
  const requiredCount=visibleFields.filter(field=>withState(field,states).required).length;
  const compactMode=fields.length<=7;
  const longMode=fields.length>7;
  const completedCount=visibleFields.filter(field=>isCompleteValue(values[field.id],withState(field,states))).length;
  const progressPercent=visibleFields.length?Math.round((completedCount/visibleFields.length)*100):0;
  const updateValue=(field,value)=>{setValues(current=>({...current,[field.id]:value}));onFieldChange?.(field.id,value);};
  return <form className={`card public-form ${compactMode?"compact-form public-form--compact":"long-form"} ${longMode?"has-sticky-submit":""}`} onSubmit={onSubmit} noValidate>
    <div className="public-accent"/>
    <header className="public-form-header">
      <div className="public-brand"><span>F</span><strong>FormFlow</strong></div>
      <span className="eyebrow">{preview?"Preview mode":"Shared form"}</span>
      <h1>{form.title}</h1>
      {form.description&&<p>{form.description}</p>}
      <div className="public-form-meta"><span>{completionTime(visibleFields)} min</span><span>{visibleFields.length} questions</span><span>{requiredCount} required</span></div>
      <div className="public-progress-wrap" aria-label={`${progressPercent}% complete`}><div><span>{completedCount} of {visibleFields.length} complete</span><strong>{progressPercent}%</strong></div><div className="public-progress"><i style={{width:`${progressPercent}%`}}/></div></div>
      {preview&&<div className="notice info">Preview mode - test values will not be submitted.</div>}
      {message&&<div className="notice error">{message}</div>}
    </header>
    <div className="public-fields">{fields.map((rawField,index)=>{
      if(!visible(rawField,states))return null;
      const field=withState(rawField,states);
      const error=errors[field.id]||errors[String(field.id)];
      const helpId=`field-${field.id}-help`; const errorId=`field-${field.id}-error`;
      const section=sectionFor(field);
      const previousVisible=fields.slice(0,index).filter(item=>visible(item,states)).at(-1);
      const previousSection=previousVisible?sectionFor(previousVisible):null;
      const showSection=section!==previousSection;
      return <Fragment key={field.id}>{showSection&&<div className="public-section-heading"><span>{section}</span></div>}<div className={`public-field ${error?"has-error":""}`} data-field-id={field.id}>
        <label className="public-field-label" htmlFor={`field-${field.id}`}><span>{field.label}{field.required&&<b> *</b>}</span></label>
        {field.help_text&&<small id={helpId} className="public-help">{field.help_text}</small>}
        <FieldInput field={field} value={values[field.id]} error={error} onChange={value=>updateValue(field,value)}/>
        <small id={errorId} className="field-error" role="alert">{error||""}</small>
      </div></Fragment>;
    })}</div>
    <footer className="public-submit-area">
      <button className="button primary public-submit-button" type="submit" disabled={busy}>{preview?"Preview Only":busy?"Submitting...":"Submit Response"}</button>
      {busy&&uploadProgress>0&&uploadProgress<100&&<div className="upload-progress" aria-label={`Upload ${uploadProgress}% complete`}><i style={{width:`${uploadProgress}%`}}/><span>{uploadProgress}%</span></div>}
      <p><LockKeyhole/> {completedCount}/{visibleFields.length} complete · Your response will be securely submitted.</p>
    </footer>
  </form>;
}

function unavailableMessage(error){
  const status=error.response?.status;
  if(status===404)return "This form link is invalid or has expired.";
  if(status===410)return "This form is no longer accepting responses.";
  return error.response?.data?.error?.message||error.response?.data?.detail||"Form unavailable. Please try again.";
}

function newIdempotencyKey(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}

export default function PublicForm(){
  const {linkToken}=useParams();
  const [form,setForm]=useState(null);
  const [values,setValues]=useState({});
  const [errors,setErrors]=useState({});
  const [state,setState]=useState("loading");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [submission,setSubmission]=useState(null);
  const [submitKey,setSubmitKey]=useState(()=>newIdempotencyKey());
  const [uploadProgress,setUploadProgress]=useState(0);
  const fieldStates=useMemo(()=>evaluateConditionalRules(form?.fields||[],form?.conditional_rules||[],values).field_states,[form,values]);
  const visibleValues=()=>Object.fromEntries(Object.entries(values).filter(([key])=>fieldStates[String(key)]?.visible!==false));
  const load=()=>{setState("loading");setMessage("");API.get(`/public/forms/${linkToken}`).then(response=>{setForm(response.data);setState("ready")}).catch(error=>{setMessage(unavailableMessage(error));setState("error")})};
  useEffect(()=>{load()},[linkToken]);
  useEffect(()=>{
    if(!form)return;
    setValues(current=>{
      const next=Object.fromEntries(Object.entries(current).filter(([key])=>fieldStates[String(key)]?.visible!==false));
      return Object.keys(next).length===Object.keys(current).length?current:next;
    });
    setErrors(current=>{
      const next=Object.fromEntries(Object.entries(current).filter(([key])=>fieldStates[String(key)]?.visible!==false));
      return Object.keys(next).length===Object.keys(current).length?current:next;
    });
  },[form,fieldStates]);
  const focusFirstError=()=>window.requestAnimationFrame(()=>{const node=document.querySelector(".public-field.has-error input, .public-field.has-error select, .public-field.has-error textarea, .public-field.has-error button");node?.focus?.();node?.scrollIntoView?.({behavior:"smooth",block:"center"})});
  const validateLocal=()=>{const next={};(form?.fields||[]).filter(field=>visible(field,fieldStates)).forEach(rawField=>{const field=withState(rawField,fieldStates);const value=values[field.id];const rules=validationRules(field);if(field.required&&isEmptyValue(value,field)){next[field.id]=requiredMessage(field);return}if(isEmptyValue(value,field))return;if((field.field_type==="email"||rules.email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))){next[field.id]=rules.email?.error_message||"Enter a valid email address";return}if(["number","rating"].includes(field.field_type)&&Number.isNaN(Number(value))){next[field.id]="Enter a valid number";return}if(field.field_type==="number"){const numeric=Number(value);if(rules.integer&&String(rules.integer.rule_value||"true").toLowerCase()!=="false"&&!Number.isInteger(numeric)){next[field.id]="Enter a whole number";return}if(rules.decimal&&String(rules.decimal.rule_value||"true").toLowerCase()!=="false"&&!/^-?\d+(\.\d+)?$/.test(String(value).trim())){next[field.id]="Enter a valid decimal number";return}}if(rules.min_value&&Number(value)<Number(rules.min_value.rule_value)){next[field.id]=`Minimum value is ${rules.min_value.rule_value}`;return}if(rules.max_value&&Number(value)>Number(rules.max_value.rule_value)){next[field.id]=`Maximum value is ${rules.max_value.rule_value}`;return}if(rules.min_length&&String(value).length<Number(rules.min_length.rule_value)){next[field.id]=`Minimum length is ${rules.min_length.rule_value}`;return}if(rules.max_length&&String(value).length>Number(rules.max_length.rule_value)){next[field.id]=`Maximum length is ${rules.max_length.rule_value}`;return}if(field.field_type==="date"){const parsed=Date.parse(value);if(Number.isNaN(parsed)){next[field.id]="Enter a valid date";return}if(rules.min_date&&Date.parse(value)<Date.parse(rules.min_date.rule_value)){next[field.id]="Date is too early";return}if(rules.max_date&&Date.parse(value)>Date.parse(rules.max_date.rule_value)){next[field.id]="Date is too late";return}}if(optionTypes.has(field.field_type)){const allowed=new Set((field.options||[]).map(option=>String(option.option_value)));const selected=Array.isArray(value)?value:[value];if(selected.some(item=>!allowed.has(String(item)))){next[field.id]="Invalid option";return}}if(field.field_type==="file"&&value instanceof File){const {allowed,maxSize}=fileConfig(field);const ext=value.name.includes(".")?value.name.split(".").pop().toLowerCase():"";if(!allowed.includes(ext)){next[field.id]=`File type must be one of: ${allowed.map(type=>labels[type]||type.toUpperCase()).join(", ")}`;return}if(maxSize&&value.size>Number(maxSize)*1024*1024){next[field.id]=`File size must not exceed ${maxSize} MB.`;return}}if(rules.regex?.rule_value){try{const pattern=new RegExp(rules.regex.rule_value);if(!pattern.test(String(value)))next[field.id]=rules.regex.error_message||"Invalid format"}catch{next[field.id]="Invalid regex validation pattern"}}});return next};
  const submit=async event=>{
    event.preventDefault();setMessage("");
    const localErrors=validateLocal();setErrors(localErrors);if(Object.keys(localErrors).length){focusFirstError();return}
    setBusy(true);setUploadProgress(0);
    try{
      const applicableValues=visibleValues();
      const hasFiles=Object.values(applicableValues).some(value=>value instanceof File);
      let response;
      const headers={"Idempotency-Key":submitKey};
      if(hasFiles){
        const data=new FormData();
        const plain={};
        Object.entries(applicableValues).forEach(([key,value])=>{if(value instanceof File)data.append(`field_${key}`,value);else plain[key]=value});
        data.append("values",JSON.stringify(plain));
        response=await API.post(`/public/forms/${linkToken}/submit-multipart`,data,{headers:{...headers,"Content-Type":"multipart/form-data"},onUploadProgress:event=>{if(event.total)setUploadProgress(Math.round((event.loaded*100)/event.total))}});
      }else response=await API.post(`/public/forms/${linkToken}/submit`,{values:applicableValues},{headers});
      setSubmission(response.data);setState("success");setSubmitKey(newIdempotencyKey());
    }catch(error){
      const detail=error.response?.data?.error?.details||error.response?.data?.detail;
      const next=detail?.fields||{};
      setErrors(next);setMessage(error.response?.data?.error?.message||detail?.message||"Submission failed. Please review the highlighted fields.");
      if(Object.keys(next).length)focusFirstError();
    }finally{setBusy(false);setUploadProgress(0)}
  };
  const submitAnother=()=>{setValues({});setErrors({});setSubmission(null);setMessage("");setSubmitKey(newIdempotencyKey());setState("ready");window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}))};
  if(state==="loading")return <main className="public-page"><div className="public-loading card"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div></main>;
  if(state==="error")return <main className="public-page"><section className="card public-form public-state-card"><div className="public-brand"><span>F</span><strong>FormFlow</strong></div><h1>Form unavailable</h1><p>{message}</p><button className="button secondary" onClick={load}><RefreshCcw/> Retry</button></section></main>;
  if(state==="success")return <main className="public-page success-page"><section className="card submission-success" role="status" aria-live="polite"><span className="success-icon large" aria-hidden="true"><CheckCircle2/></span><h1>Thank You</h1><p>Your response has been recorded successfully.</p>{submission?.response_id&&<div className="response-id-pill">Response ID #{submission.response_id}</div>}{submission?.timestamp&&<small>Submitted {new Date(submission.timestamp).toLocaleString()}</small>}<button className="button primary" type="button" onClick={submitAnother}>Submit Another Response</button></section></main>;
  return <main className="public-page"><PublicFormBody form={form} values={values} setValues={setValues} errors={errors} onSubmit={submit} message={message} busy={busy} uploadProgress={uploadProgress} fieldStates={fieldStates} onFieldChange={fieldId=>setErrors(current=>{const next={...current};delete next[fieldId];delete next[String(fieldId)];return next})}/></main>;
}
