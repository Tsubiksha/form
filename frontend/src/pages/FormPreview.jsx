import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import API from "../services/api";
import {apiMessage} from "../utils/errors";
import {PublicFormBody} from "./PublicForm";

function previewIssues(error){
  const fields=error.response?.data?.errors?.fields||error.response?.data?.error?.details?.fields||error.response?.data?.detail?.fields||{};
  return Object.entries(fields).map(([key,message])=>({key,message}));
}

export default function FormPreview(){
  const {formId}=useParams();
  const [form,setForm]=useState(null);
  const [values,setValues]=useState({});
  const [error,setError]=useState("");
  const [issues,setIssues]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    setLoading(true);
    setError("");
    setIssues([]);
    API.get(`/forms/${formId}/preview`)
      .then(response=>setForm(response.data))
      .catch(error=>{
        setError(apiMessage(error,"Preview is not available yet. Fix form issues before publishing."));
        setIssues(previewIssues(error));
      })
      .finally(()=>setLoading(false));
  },[formId]);

  return <main className="page-shell preview-page">
    <Link className="back-link" to={`/forms/${formId}/builder`}>← Back to builder</Link>
    <header className="page-header">
      <div><span className="eyebrow">Preview before publishing</span><h1>Form Preview</h1><p>This is how respondents will see your form.</p></div>
      <div className="header-actions"><Link className="button secondary" to={`/forms/${formId}/builder`}>Open Builder</Link></div>
    </header>
    {loading?<div className="card empty-state">Loading preview...</div>:error?<section className="card preview-validation-card" role="alert">
      <span className="eyebrow">Before previewing</span>
      <h2>{error}</h2>
      <p>Resolve these form setup issues in the builder, then open Preview again.</p>
      {issues.length?<ul>{issues.map(issue=><li key={issue.key}>{issue.message}</li>)}</ul>:<p className="muted">No detailed validation issues were returned by the server.</p>}
      <Link className="button primary" to={`/forms/${formId}/builder`}>Back to Builder</Link>
    </section>:<div className="preview-frame"><PublicFormBody form={form} values={values} setValues={setValues} preview onSubmit={event=>event.preventDefault()}/></div>}
  </main>;
}
