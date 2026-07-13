import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {BarChart3,Download,FileSpreadsheet,FileText,Inbox} from "lucide-react";
import API from "../services/api";
import {useToast} from "../components/ToastProvider";
import {apiMessage} from "../utils/errors";
import {relativeTime} from "../utils/relativeTime";

const normalizedStatus=form=>String(form.status||"").toLowerCase();
const responseCount=form=>Number(form.response_count||0);
const timestamp=(value)=>value?new Date(value).getTime():null;
const latestSubmission=form=>form.latest_submission_at||form.latest_submission;
const publishedAt=form=>form.published_at||form.updated_at;
const compareDatesDescending=(a,b,nullsLast=true)=>{
  const left=timestamp(a),right=timestamp(b);
  if(left===null&&right===null)return 0;
  if(left===null)return nullsLast?1:-1;
  if(right===null)return nullsLast?-1:1;
  return right-left;
};
const compareDatesAscending=(a,b,nullsLast=true)=>{
  const left=timestamp(a),right=timestamp(b);
  if(left===null&&right===null)return 0;
  if(left===null)return nullsLast?1:-1;
  if(right===null)return nullsLast?-1:1;
  return left-right;
};

export default function ResponsesOverview(){
  const [forms,setForms]=useState([]);
  const [loading,setLoading]=useState(true);
  const [exporting,setExporting]=useState("");
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("");
  const [sort,setSort]=useState("most-responses");
  const toast=useToast();

  useEffect(()=>{
    API.get("/forms/",{params:{page:1,page_size:100}})
      .then(response=>setForms(response.data.items||response.data))
      .catch(error=>toast.error(apiMessage(error,"Unable to load forms")))
      .finally(()=>setLoading(false));
  },[toast]);

  const responseForms=useMemo(()=>forms.filter(form=>normalizedStatus(form)==="published"||responseCount(form)>0),[forms]);
  const visible=useMemo(()=>responseForms
    .filter(form=>{
      const currentStatus=normalizedStatus(form);
      if(status==="published"&&currentStatus!=="published")return false;
      if(status==="archived"&&(currentStatus!=="archived"||responseCount(form)<=0))return false;
      return String(form.title||"").toLowerCase().includes(search.toLowerCase());
    })
    .sort((a,b)=>{
      switch(sort){
        case "fewest-responses": return responseCount(a)-responseCount(b)||String(a.title||"").localeCompare(String(b.title||""));
        case "recently-submitted": return compareDatesDescending(latestSubmission(a),latestSubmission(b),true);
        case "oldest-submission": return compareDatesAscending(latestSubmission(a),latestSubmission(b),true);
        case "name-asc": return String(a.title||"").localeCompare(String(b.title||""));
        case "name-desc": return String(b.title||"").localeCompare(String(a.title||""));
        case "recently-published": return compareDatesDescending(publishedAt(a),publishedAt(b),true);
        case "oldest-published": return compareDatesAscending(publishedAt(a),publishedAt(b),true);
        case "most-responses":
        default: return responseCount(b)-responseCount(a)||compareDatesDescending(latestSubmission(a),latestSubmission(b),true);
      }
    }),[responseForms,search,status,sort]);
  const total=responseForms.reduce((sum,form)=>sum+responseCount(form),0);
  const latest=responseForms.filter(form=>latestSubmission(form)).sort((a,b)=>compareDatesDescending(latestSubmission(a),latestSubmission(b),true))[0];
  const resultLabel=`${visible.length} ${visible.length===1?"form":"forms"}`;
  const emptyTitle=search?"No forms match your search.":status==="published"?"No published forms found.":status==="archived"?"No archived forms with responses found.":"No response forms found";
  const emptyMessage=search?"Try a different search term.":status==="published"?"Publish a form to start collecting responses.":status==="archived"?"Archived forms will appear here only when they have historical responses.":"Published forms and any forms with existing responses will appear here.";

  const download=async(form,type)=>{
    if(responseCount(form)<=0)return toast.error("No responses available to export yet.");
    const key=`${form.id}-${type}`;
    setExporting(key);
    try{
      const {data}=await API.get(`/forms/${form.id}/responses/export/${type}`,{responseType:"blob"});
      const ext={csv:"csv",excel:"xlsx",pdf:"pdf"}[type];
      const url=URL.createObjectURL(data);
      const link=document.createElement("a");
      link.href=url;
      link.download=`${form.title}-responses.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${type==="excel"?"Excel":type.toUpperCase()} exported`);
    }catch(error){toast.error(apiMessage(error,"Export failed"))}
    finally{setExporting("")}
  };

  return <main className="page-shell responses-overview-page">
    <header className="user-page-header"><div><span className="eyebrow">Response center</span><h1>Responses</h1><p>Review submission activity and export results from every form.</p></div></header>
    {!loading&&<section className="response-overview-stats">
      <article><span><Inbox/></span><div><strong>{total}</strong><small>Total Responses</small></div></article>
      <article><span><BarChart3/></span><div><strong>{responseForms.filter(form=>responseCount(form)>0).length}</strong><small>Forms Responding</small></div></article>
      <article><span><FileText/></span><div><strong>{responseForms.length}</strong><small>Total Forms</small></div></article>
      <article><span><FileSpreadsheet/></span><div><strong>{latest?relativeTime(latestSubmission(latest)):"No submissions yet"}</strong><small>Latest Submission</small></div></article>
    </section>}
    <section className="responses-controls card">
      <label>Search forms<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search by form title..."/></label>
      <label>Form status<select value={status} onChange={event=>setStatus(event.target.value)}><option value="">All response forms</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
      <label>Sort by<select value={sort} onChange={event=>setSort(event.target.value)}><option value="most-responses">Most responses</option><option value="fewest-responses">Fewest responses</option><option value="recently-submitted">Recently submitted</option><option value="oldest-submission">Oldest submission</option><option value="name-asc">Form name: A–Z</option><option value="name-desc">Form name: Z–A</option><option value="recently-published">Recently published</option><option value="oldest-published">Oldest published</option></select></label>
      <span className="responses-result-count">{resultLabel}</span>
    </section>
    {loading?<div className="form-card-grid"><div className="skeleton card"/><div className="skeleton card"/></div>:visible.length?<section className="response-form-grid">{visible.map(form=>{
      const hasResponses=responseCount(form)>0;
      return <article className="response-form-card" key={form.id}>
        <div className="form-card-top"><span className="form-glyph"><BarChart3/></span><span className={`status ${normalizedStatus(form)}`}>{form.status}</span></div>
        <h2>{form.title}</h2>
        <div className="response-card-summary"><strong>{responseCount(form)}</strong><span>responses collected</span><small>{latestSubmission(form)?`Latest ${relativeTime(latestSubmission(form))}`:"No submissions yet"}</small></div>
        <Link className="button secondary full" to={`/responses/forms/${form.id}`}>View Responses</Link>
        {!hasResponses&&<p className="response-card-hint">Publish and share this form to start collecting responses.</p>}
        <div className="export-button-row">
          <button onClick={()=>download(form,"csv")} disabled={!!exporting||!hasResponses}><Download/> CSV</button>
          <button onClick={()=>download(form,"excel")} disabled={!!exporting||!hasResponses}><Download/> Excel</button>
          <button onClick={()=>download(form,"pdf")} disabled={!!exporting||!hasResponses}><Download/> PDF</button>
        </div>
      </article>;
    })}</section>:<div className="card empty-state"><h2>{emptyTitle}</h2><p>{emptyMessage}</p><Link className="button primary" to="/forms">Go to Forms</Link></div>}
  </main>;
}
