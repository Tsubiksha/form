import { useTranslation } from "react-i18next";
import {Fragment,useEffect,useMemo,useRef,useState} from "react";
import {useParams} from "react-router-dom";
import {AlertCircle,CheckCircle2,LockKeyhole,RefreshCcw,UploadCloud,X} from "lucide-react";
import API from "../services/api";
import {evaluateConditionalRules,isEmptyValue as baseEmptyValue} from "../utils/conditionalLogic";
import "./PublicForm.css";
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
  const { t } = useTranslation();
  const {allowed,maxSize}=fileConfig(field);
  const inputRef=useRef(null);
  const clear=()=>{if(inputRef.current)inputRef.current.value="";onChange(null)};
  const choose=file=>{if(file)onChange(file)};
  const onDrop=event=>{event.preventDefault();choose(event.dataTransfer.files?.[0])};
  return <div className={`public-upload-zone compact ${value?.name?"has-file":""}`}>
    <input ref={inputRef} id={`field-${field.id}`} type="file" style={{ display: 'none' }} required={field.required} accept={allowed.map(type=>`.${type}`).join(",")} onChange={event=>onChange(event.target.files?.[0]||null)}/>
    {!value?.name?<div className="compact-upload-row" onDragOver={event=>event.preventDefault()} onDrop={onDrop} onClick={()=>inputRef.current?.click()}><button type="button" className="btn btn-secondary" onClick={event=>{event.stopPropagation();inputRef.current?.click()}}>{t('ui.choose_file', `Choose File`)}</button><span>{t('ui.no_file_selected_drop_file_here', `No file selected · drop file here`)}</span></div>:<div className="selected-file-card compact"><CheckCircle2/><div><strong>{value.name}</strong><small>{formatSize(value.size)||"Selected file"}</small></div><button type="button" className="btn btn-secondary" onClick={()=>inputRef.current?.click()}>{t('ui.change_file', `Change File`)}</button><button type="button" className="remove-file-button" onClick={clear} aria-label="Remove selected file"><X/></button></div>}
    <small>{t('ui.allowed', `Allowed:`)}{allowed.map(type=>labels[type]||type.toUpperCase()).join(", ")}{maxSize?` · Maximum: ${maxSize} MB`:""}</small>
  </div>;
}

export function FieldInput({field,value,onChange,error}) {
  const { t } = useTranslation();
  const describedBy=[field.help_text?`field-${field.id}-help`:null,error?`field-${field.id}-error`:null].filter(Boolean).join(" ")||undefined;
  const common={id:`field-${field.id}`,value:value??"",required:field.required,"aria-required":field.required||undefined,"aria-invalid":!!error,"aria-describedby":describedBy,onChange:event=>onChange(field.field_type==="checkbox"?event.target.checked:event.target.value)};
  if(field.field_type==="textarea")return <textarea {...common} rows="5" placeholder={field.placeholder||""}/>;
  if(field.field_type==="checkbox")return <label className={`public-choice single ${value?"selected":""}`}><input id={common.id} type="checkbox" checked={!!value} required={field.required} aria-required={field.required||undefined} aria-invalid={!!error} aria-describedby={describedBy} onChange={event=>onChange(event.target.checked)}/><span>{field.placeholder||"Yes, I agree"}</span></label>;
  if(field.field_type==="dropdown")return <select {...common}><option value="">{t('ui.select_an_option', `Select an option`)}</option>{(field.options||[]).map(option=><option key={option.id} value={option.option_value}>{option.option_label}</option>)}</select>;
  if(field.field_type==="radio")return <div className="public-choice-group" role="radiogroup" aria-describedby={describedBy}>{(field.options||[]).map(option=><label className={`public-choice ${value===option.option_value?"selected":""}`} key={option.id}><input type="radio" name={`field-${field.id}`} value={option.option_value} checked={value===option.option_value} onChange={event=>onChange(event.target.value)}/><span>{option.option_label}</span></label>)}</div>;
  if(["multi_select","checkbox_group"].includes(field.field_type))return <div className="public-choice-group checkbox-grid" aria-describedby={describedBy}>{(field.options||[]).map(option=><label className={`public-choice ${(value||[]).includes(option.option_value)?"selected":""}`} key={option.id}><input type="checkbox" checked={(value||[]).includes(option.option_value)} onChange={event=>onChange(event.target.checked?[...(value||[]),option.option_value]:(value||[]).filter(item=>item!==option.option_value))}/><span>{option.option_label}</span></label>)}</div>;
  if(field.field_type==="rating")return <RatingInput field={field} value={value} onChange={onChange}/>;
  if(field.field_type==="file")return <CompactFileUploadInput field={field} value={value} onChange={onChange}/>;
  return <input {...common} type={["email","number","date"].includes(field.field_type)?field.field_type:"text"} placeholder={field.placeholder||""}/>;
}

export function PublicFormBody({form,values,setValues,errors={},preview=false,onSubmit,message,busy=false,onFieldChange,fieldStates={},uploadProgress=0}) {
  const { t } = useTranslation();
  const [activeFieldId, setActiveFieldId] = useState(null);
  const fields=form.fields||[];
  const states=useMemo(()=>Object.keys(fieldStates).length?fieldStates:evaluateConditionalRules(fields,form.conditional_rules||[],values).field_states,[fields,form.conditional_rules,values,fieldStates]);
  const visibleFields=fields.filter(field=>visible(field,states));
  const requiredCount=visibleFields.filter(field=>withState(field,states).required).length;
  const compactMode=fields.length<=7;
  const longMode=fields.length>7;
  const completedCount=visibleFields.filter(field=>isCompleteValue(values[field.id],withState(field,states))).length;
  const progressPercent=visibleFields.length?Math.round((completedCount/visibleFields.length)*100):0;
  const updateValue=(field,value)=>{setValues(current=>({...current,[field.id]:value}));onFieldChange?.(field.id,value);};
  return <div className="google-form-wrapper">
    <div className="google-card google-header-card">
      <h1>{form.title}</h1>
      {form.description&&<p>{form.description}</p>}
      <div className="google-form-meta">
        <span style={{ color: 'var(--danger-600)', fontSize: '16px' }}>*</span>{t('ui.indicates_required_question', `Indicates required question`)}</div>
      {preview&&<div className="notice info" style={{ marginTop: '16px', background: 'var(--info-50)', color: 'var(--info-600)', border: 'none' }}>{t('ui.preview_mode_test_values_will_not_be_sub', `Preview mode - test values will not be submitted.`)}</div>}
      {message&&<div className="notice error" style={{ marginTop: '16px' }}>{message}</div>}
    </div>
    
    <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {fields.map((rawField,index)=>{
        if(!visible(rawField,states))return null;
        const field=withState(rawField,states);
        const error=errors[field.id]||errors[String(field.id)];
        const helpId=`field-${field.id}-help`; const errorId=`field-${field.id}-error`;
        const section=sectionFor(field);
        const previousVisible=fields.slice(0,index).filter(item=>visible(item,states)).at(-1);
        const previousSection=previousVisible?sectionFor(previousVisible):null;
        const showSection=section!==previousSection;
        const isActive = activeFieldId === field.id;
        
        return <Fragment key={field.id}>
          {showSection&&<div className="public-section-heading">{section}</div>}
          <div 
            className={`google-card public-field ${error?"has-error":""} ${isActive ? "active-card" : ""}`} 
            data-field-id={field.id}
            onFocusCapture={() => setActiveFieldId(field.id)}
            onClick={() => setActiveFieldId(field.id)}
          >
            <label className="public-field-label" htmlFor={`field-${field.id}`}>
              {field.label}{field.required&&<b> *</b>}
            </label>
            {field.help_text&&<small id={helpId} className="public-help">{field.help_text}</small>}
            <FieldInput field={field} value={values[field.id]} error={error} onChange={value=>updateValue(field,value)}/>
            {error && <div id={errorId} className="field-error" role="alert">
              <AlertCircle size={14}/> {error}
            </div>}
          </div>
        </Fragment>;
      })}
      <div className="public-submit-area">
        <button className="public-submit-button" type="submit" disabled={busy}>{preview?"Preview":busy?"Submitting...":"Submit"}</button>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('ui.never_submit_passwords_through_this_form', `Never submit passwords through this form.`)}</span>
      </div>
    </form>
  </div>;
}

function unavailableMessage(error){
  const status=error.response?.status;
  if(status===404)return "This form link is invalid or has expired.";
  if(status===410)return "This form is no longer accepting responses.";
  return error.response?.data?.error?.message||error.response?.data?.detail||"Form unavailable. Please try again.";
}

function newIdempotencyKey(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}

export default function PublicForm(){
  const { t } = useTranslation();
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
  const load=()=>{setState("loading");setMessage("");API.get(`/public/forms/${linkToken}`).then(response=>{setForm(response.data);setState("ready");// Day 14: track form open silently (analytics)
    API.post(`/public/forms/${linkToken}/open`).catch(()=>{/*silent – analytics only*/});}).catch(error=>{setMessage(unavailableMessage(error));setState("error")})};
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
  if(state==="error")return <main className="public-page"><section className="card public-form public-state-card"><div className="public-brand"><span>{t('ui.f', `F`)}</span><strong>{t('ui.formflow', `FormFlow`)}</strong></div><h1>{t('ui.form_unavailable', `Form unavailable`)}</h1><p>{message}</p><button className="btn btn-secondary" onClick={load}><RefreshCcw size={16}/>{t('ui.retry', `Retry`)}</button></section></main>;
  if (state === "success") {
    const formatTimestamp = (isoString) => {
      if (!isoString) return "";
      let safeString = isoString;
      if (/T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(safeString)) safeString += 'Z';
      const date = new Date(safeString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
      const timeStr = date.toLocaleTimeString("en-US", timeOptions);
      
      if (date.toDateString() === today.toDateString()) {
        return `Today, ${timeStr}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${timeStr}`;
      } else {
        return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • ${timeStr}`;
      }
    };

    const formattedDate = submission?.timestamp 
      ? formatTimestamp(submission.timestamp)
      : formatTimestamp(new Date().toISOString());

    return (
      <main className="public-page" style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-page)' }}>
        <section className="google-card" style={{ maxWidth: 640, width: '100%', textAlign: 'center', padding: '48px 40px', borderTop: '6px solid var(--success-500)', boxShadow: 'var(--shadow-xl)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success-50)', color: 'var(--success-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 0 0 10px var(--success-50)' }}>
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--success-50)', border: '1px solid var(--success-200)', color: 'var(--success-700)', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999, marginBottom: 16 }}>
            <CheckCircle2 size={14} />{t('ui.response_recorded_successfully', `Response Recorded Successfully`)}</div>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>{t('ui.thank_you', `Thank You!`)}</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: '0 0 32px 0', lineHeight: 1.6 }}>{t('ui.your_response_has_been_safely_submitted', `Your response has been safely submitted and stored in the database.`)}</p>

          {/* Response Information Card */}
          <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '24px', textAlign: 'left', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('ui.form_name', `Form Name`)}</span>
              <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{form?.title || "Data Collection Form"}</strong>
            </div>

            {submission?.response_id && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('ui.response_id', `Response ID`)}</span>
                <span style={{ fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 700, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--brand-200)' }}>
                  #{submission.response_id}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('ui.submission_time', `Submission Time`)}</span>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{formattedDate}</span>
            </div>
            
            {submission?.submitted_by && (
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                 <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('ui.submitted_by', `Submitted By`)}</span>
                 <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{submission.submitted_by}</span>
               </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/workspace/home" style={{ background: 'var(--brand-600)', color: 'white', textDecoration: 'none', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', boxShadow: 'var(--shadow-md)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>{t('ui.return_home', `Return Home`)}</a>

            <button type="button" onClick={submitAnother} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--gray-50)'} onMouseLeave={e => e.currentTarget.style.background='var(--bg-surface)'}>{t('ui.submit_another_response', `Submit Another Response`)}</button>
          </div>
        </section>
      </main>
    );
  }
  return <main className="public-page" style={{ padding: 0 }}><PublicFormBody form={form} values={values} setValues={setValues} errors={errors} onSubmit={submit} message={message} busy={busy} uploadProgress={uploadProgress} fieldStates={fieldStates} onFieldChange={fieldId=>setErrors(current=>{const next={...current};delete next[fieldId];delete next[String(fieldId)];return next})}/></main>;
}
