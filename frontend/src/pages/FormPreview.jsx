import { useTranslation } from "react-i18next";
import {useEffect,useState} from "react";
import {Link,useParams,useLocation} from "react-router-dom";
import {AlertTriangle,ChevronLeft,PenTool} from "lucide-react";
import API from "../services/api";
import {apiMessage} from "../utils/errors";
import {PublicFormBody} from "./PublicForm";

function previewIssues(error){
  const fields=error.response?.data?.errors?.fields||error.response?.data?.error?.details?.fields||error.response?.data?.detail?.fields||{};
  return Object.entries(fields).map(([key,message])=>({key,message}));
}

export default function FormPreview(){
  const { t } = useTranslation();
  const {formId}=useParams();
  const location=useLocation();
  const isAdminPath=location.pathname.startsWith("/admin");
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

  return <main className="workspace-viewport flex-col" style={{ background: 'var(--bg-page)', minHeight: '100vh', overflowY: 'auto' }}>
    <header className="flex justify-between items-center" style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 10 }}>
      <div className="flex-col">
        <div className="flex items-center gap-2 mb-1">
          <Link to={isAdminPath ? '/admin/forms' : `/workspace/forms/${formId}/builder`} className="btn-icon btn-ghost" style={{ padding: 4 }}><ChevronLeft size={16}/></Link>
          <span className="badge" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', padding: '2px 8px', fontSize: '11px' }}>{t('ui.preview_mode', `Preview Mode`)}</span>
        </div>
        <h1 className="text-h3" style={{ margin: 0 }}>{t('ui.form_preview', `Form Preview`)}</h1>
      </div>
      {!isAdminPath && <Link className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', minHeight: '32px' }} to={`/workspace/forms/${formId}/builder`}><PenTool size={14}/>{t('ui.open_builder', `Open Builder`)}</Link>}
    </header>

    <div className="flex-col items-center flex-1" style={{ padding: (!loading && !error) ? 0 : '40px 24px' }}>
      {loading ? (
        <div className="panel" style={{ width: '100%', maxWidth: '680px', padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('ui.loading_preview', `Loading preview...`)}</div>
      ) : error ? (
        <section className="panel flex-col items-center text-center" style={{ width: '100%', maxWidth: '560px', padding: '48px 32px' }} role="alert">
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--danger-50)', color: 'var(--danger-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <AlertTriangle size={32} />
          </div>
          <span className="badge mb-4" style={{ background: 'var(--danger-50)', color: 'var(--danger-600)' }}>{t('ui.configuration_required', `Configuration Required`)}</span>
          <h2 className="text-h2 mb-2">{t('ui.fix_form_issues_before_publishing', `Fix form issues before publishing`)}</h2>
          <p className="text-body mb-6" style={{ color: 'var(--text-secondary)' }}>{t('ui.resolve_these_form_setup_issues_in_the_b', `Resolve these form setup issues in the builder, then open Preview again.`)}</p>
          
          <div className="w-full text-left p-4 mb-8" style={{ background: 'var(--bg-surface-2)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            {issues.length ? (
              <ul style={{ paddingLeft: '20px', color: 'var(--text-primary)', margin: 0 }}>
                {issues.map(issue=><li key={issue.key} style={{ marginBottom: '8px' }}>{issue.message}</li>)}
              </ul>
            ) : (
              <p className="text-body" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>{t('ui.no_detailed_validation_issues_were_retur', `No detailed validation issues were returned by the server.`)}</p>
            )}
          </div>
          
          <Link className="btn btn-primary" to={isAdminPath ? '/admin/forms' : `/workspace/forms/${formId}/builder`}>{isAdminPath ? 'Back to Forms' : 'Back to Builder'}</Link>
        </section>
      ) : (
        <div className="w-full" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--brand-50)' }}>
          <div className="public-page" style={{ minHeight: 'auto' }}>
            <PublicFormBody form={form} values={values} setValues={setValues} preview onSubmit={event=>event.preventDefault()}/>
          </div>
        </div>
      )}
    </div>
  </main>;
}
