import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import API from "../services/api";
import {apiMessage} from "../utils/errors";
import {PublicFormBody} from "./PublicForm";

export default function FormPreview(){
  const {formId}=useParams();
  const [form,setForm]=useState(null);
  const [values,setValues]=useState({});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{API.get(`/forms/${formId}/preview`).then(response=>setForm(response.data)).catch(error=>setError(apiMessage(error,"Preview is not available yet. Fix form issues before publishing."))).finally(()=>setLoading(false))},[formId]);
  return <main className="page-shell preview-page">
    <Link className="back-link" to={`/forms/${formId}/builder`}>← Back to builder</Link>
    <header className="page-header">
      <div><span className="eyebrow">Preview before publishing</span><h1>Form Preview</h1><p>This is how respondents will see your form.</p></div>
      <div className="header-actions"><Link className="button secondary" to={`/forms/${formId}/builder`}>Open Builder</Link></div>
    </header>
    {loading?<div className="card empty-state">Loading preview...</div>:error?<div className="notice error">{error}</div>:<div className="preview-frame"><PublicFormBody form={form} values={values} setValues={setValues} preview onSubmit={event=>event.preventDefault()}/></div>}
  </main>;
}
