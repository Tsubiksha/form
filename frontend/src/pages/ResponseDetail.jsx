import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import API from "../services/api";
import {apiMessage} from "../utils/errors";

function formatSize(bytes=0){if(!bytes)return "Unknown size";if(bytes<1024*1024)return `${Math.round(bytes/1024)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`}
async function downloadFile(value){const {data}=await API.get(value.download_url,{responseType:"blob"});const url=URL.createObjectURL(data);const link=document.createElement("a");link.href=url;link.download=value.name||value.file_name||"uploaded-file";link.click();URL.revokeObjectURL(url)}
function ratingMax(fieldConfig){const max=(fieldConfig?.validation_rules||[]).find(rule=>rule.rule_type==="max_value")?.rule_value;return Number.parseInt(max||"5",10)||5}
function Value({value,fieldType,fieldConfig}){
  if(fieldType==="rating"&&value!==null&&value!==undefined&&value!==""){
    const max=ratingMax(fieldConfig);const rating=Number(value)||0;
    return <div className="rating-response-value"><strong>{rating} / {max}</strong><span>{"★".repeat(Math.max(0,Math.min(max,Math.round(rating))))}{"☆".repeat(Math.max(0,max-Math.round(rating)))}</span></div>;
  }
  if(Array.isArray(value))return value.join(", ");
  if(value&&typeof value==="object"&&value.stored_name)return <div className="uploaded-file-value"><strong>{value.name||value.file_name||"Uploaded file"}</strong><small>{value.type||"File"} · {formatSize(value.size)}{value.uploaded_at?` · Uploaded ${new Date(value.uploaded_at).toLocaleString()}`:""}</small><button className="button secondary" onClick={()=>downloadFile(value)}>Download file</button></div>;
  return String(value??"No answer");
}

export default function ResponseDetail(){
  const {formId,responseId}=useParams();
  const [item,setItem]=useState(null);
  const [error,setError]=useState("");
  useEffect(()=>{API.get(`/forms/${formId}/responses/${responseId}`).then(response=>setItem(response.data)).catch(error=>setError(apiMessage(error,"Unable to load response")))},[formId,responseId]);
  return <main className="page-shell narrow-page"><Link className="back-link" to={`/responses/forms/${formId}`}>← Back to Responses</Link>{error&&<div className="notice error">{error}</div>}{!item&&!error?<div className="card empty-state">Loading response...</div>:item&&<section className="card response-sheet"><header><span className="eyebrow">Response #{item.id}</span><h1>{item.form_name}</h1><div className="response-meta"><span>Submitted {new Date(item.submitted_at).toLocaleString()}</span><span>Version {item.version_number}</span><span className="status published">{item.status}</span></div></header><dl className="response-detail">{item.values.map(value=><div key={value.field_id}><dt>{value.field_label||`Field ${value.field_id}`}</dt><dd><Value value={value.value} fieldType={value.field_type} fieldConfig={value.field_config}/></dd></div>)}</dl></section>}</main>;
}
