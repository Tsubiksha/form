import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Link,useParams,useSearchParams} from "react-router-dom";
import {Area,AreaChart,ResponsiveContainer,Tooltip,XAxis} from "recharts";
import {ArrowRight,BarChart3,Clock,Download,Eye,FileText,Inbox,Layers3,Paperclip,TrendingUp,X} from "lucide-react";
import API from "../services/api";
import {useToast} from "../components/ToastProvider";
import {apiMessage} from "../utils/errors";
import {relativeTime} from "../utils/relativeTime";

function countFiles(response){
  return (response.values||[]).filter(item=>item.value&&typeof item.value==="object"&&item.value.stored_name).length;
}
function trend(items=[]){
  const counts=new Map();
  items.forEach(item=>{const key=new Date(item.submitted_at).toLocaleDateString(undefined,{month:"short",day:"numeric"});counts.set(key,(counts.get(key)||0)+1)});
  return Array.from(counts.entries()).reverse().map(([date,responses])=>({date,responses}));
}
function versionCount(version){return Number(version.response_count||0)}
function ValuePreview({item}){
  const value=item.value;
  if(Array.isArray(value))return value.join(", ");
  if(value&&typeof value==="object"&&value.stored_name)return value.name||value.file_name||"Uploaded file";
  return String(value??"No answer");
}

export default function Responses(){
  const {formId}=useParams();
  const [params,setParams]=useSearchParams();
  const requestedVersion=params.get("version")||"";
  const [data,setData]=useState({items:[],total:0,versions:[]});
  const [loading,setLoading]=useState(true);
  const [exporting,setExporting]=useState("");
  const [error,setError]=useState("");
  const [preview,setPreview]=useState(null);
  const [previewLoading,setPreviewLoading]=useState(false);
  const [compareOpen,setCompareOpen]=useState(false);
  const [compareBase,setCompareBase]=useState("");
  const [compareTarget,setCompareTarget]=useState("");
  const [compareLoading,setCompareLoading]=useState(false);
  const [compareError,setCompareError]=useState("");
  const [compareResult,setCompareResult]=useState(null);
  const [scrollState,setScrollState]=useState({left:false,right:false});
  const versionListRef=useRef(null);
  const toast=useToast();

  const load=useCallback(async()=>{
    setLoading(true);
    setError("");
    try{
      const requestParams={};
      if(requestedVersion&&requestedVersion!=="all")requestParams.version_id=requestedVersion;
      const response=await API.get(`/forms/${formId}/responses`,{params:requestParams});
      setData(response.data);
      if(!requestedVersion)setParams({version:"all"},{replace:true});
    }catch(error){
      const message=error.response?.status===403?"You do not have permission to view these responses.":error.response?.status===404?"Form not found.":apiMessage(error,"Unable to load responses");
      setError(message);
      toast.error(message);
    }finally{setLoading(false)}
  },[formId,requestedVersion,setParams,toast]);

  useEffect(()=>{load()},[load]);

  const versions=data.versions||[];
  const comparableVersions=versions.filter(version=>String(version.status||"").toLowerCase()==="published");
  const selectedVersion=useMemo(()=>versions.find(version=>String(version.id)===String(requestedVersion)),[versions,requestedVersion]);
  const allVersions=requestedVersion==="all";
  const versionUnavailable=!loading&&requestedVersion&&!allVersions&&!selectedVersion&&!error;
  const allVersionCount=versions.reduce((sum,version)=>sum+versionCount(version),0);
  const latest=data.items[0]?.submitted_at;
  const mostActive=useMemo(()=>{
    const withResponses=versions.filter(version=>versionCount(version)>0);
    if(!withResponses.length)return null;
    return withResponses.reduce((best,item)=>{
      if(versionCount(item)>versionCount(best))return item;
      if(versionCount(item)===versionCount(best)&&Number(item.version_number||0)>Number(best.version_number||0))return item;
      return best;
    },withResponses[0]);
  },[versions]);
  const uploadCount=data.items.reduce((total,item)=>total+countFiles(item),0);
  const selectedResponseCount=allVersions?Number(data.total||allVersionCount):Number(data.total||0);
  const chartData=trend(data.items);
  const canExport=selectedResponseCount>0&&!loading&&!versionUnavailable&&!error;
  const canExportCsv=canExport&&!allVersions;

  const updateScrollState=useCallback(()=>{
    const node=versionListRef.current;
    if(!node)return;
    setScrollState({left:node.scrollLeft>2,right:node.scrollLeft+node.clientWidth<node.scrollWidth-2});
  },[]);
  useEffect(()=>{updateScrollState();window.addEventListener("resize",updateScrollState);return()=>window.removeEventListener("resize",updateScrollState)},[versions.length,updateScrollState]);
  useEffect(()=>{
    const node=versionListRef.current;
    if(!node)return;
    const active=node.querySelector(".active");
    active?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
    window.requestAnimationFrame(updateScrollState);
  },[requestedVersion,versions.length,updateScrollState]);
  const scrollVersions=direction=>versionListRef.current?.scrollBy({left:direction*260,behavior:"smooth"});

  const download=async(type)=>{
    if(!canExport)return toast.error("No responses available to export yet.");
    if(type==="csv"&&allVersions)return toast.error("Select a specific version to export CSV.");
    const key=`${type}-${requestedVersion||"latest"}`;
    setExporting(key);
    try{
      const requestParams={};
      if(requestedVersion&&requestedVersion!=="all")requestParams.version_id=requestedVersion;
      const {data:blob}=await API.get(`/forms/${formId}/responses/export/${type}`,{params:requestParams,responseType:"blob"});
      const ext={csv:"csv",excel:"xlsx",pdf:"pdf"}[type];
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=`responses${selectedVersion?`-version-${selectedVersion.version_number}`:""}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type==="excel"?"Excel":type.toUpperCase()} Exported Successfully`);
    }catch(error){toast.error(apiMessage(error,`Failed to Export ${type}`))}
    finally{setExporting("")}
  };
  const chooseVersion=value=>setParams(value==="all"?{version:"all"}:{version:String(value)});
  const latestVersions=[...versions].sort((a,b)=>Number(b.version_number||0)-Number(a.version_number||0)).slice(0,3);
  const openPreview=async(response)=>{
    setPreviewLoading(true);
    try{const result=await API.get(`/forms/${formId}/responses/${response.id}`);setPreview(result.data)}
    catch(error){toast.error(apiMessage(error,"Unable to load response preview"))}
    finally{setPreviewLoading(false)}
  };
  const openCompare=()=>{
    if(comparableVersions.length<2)return toast.error("At least two published versions are required.");
    const sorted=[...comparableVersions].sort((a,b)=>Number(b.version_number||0)-Number(a.version_number||0));
    setCompareTarget(String(sorted[0].id));
    setCompareBase(String(sorted[1].id));
    setCompareResult(null);
    setCompareError("");
    setCompareOpen(true);
  };
  const runCompare=async()=>{
    if(!compareBase||!compareTarget||String(compareBase)===String(compareTarget)){setCompareError("Choose two different versions to compare.");return}
    setCompareLoading(true);setCompareError("");
    try{
      const response=await API.get(`/forms/${formId}/versions/compare`,{params:{base_version_id:compareBase,target_version_id:compareTarget}});
      setCompareResult(response.data);
    }catch(error){setCompareError(apiMessage(error,"Unable to compare versions."))}
    finally{setCompareLoading(false)}
  };
  const formatCompareValue=value=>Array.isArray(value)||value&&typeof value==="object"?JSON.stringify(value):String(value??"None");

  return <main className="page-shell responses-page analytics-responses-page">
    <Link className="back-link" to="/responses">← Back to Responses</Link>
    <div className="response-breadcrumb"><Link to="/responses">Responses</Link><span>/</span><strong>{data.form?.title||"Form responses"}</strong></div>
    <header className="response-analytics-hero">
      <div><span className="eyebrow">Response analytics</span><h1>{data.form?.title||"Responses"}</h1><p>{selectedVersion?`Version ${selectedVersion.version_number} • Published ${selectedVersion.created_at?new Date(selectedVersion.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"date unavailable"}`:"All published versions"}</p><div className="response-hero-meta"><span>{selectedResponseCount} responses</span><span>{selectedVersion?.field_count??"All"} fields</span><span>{latest?`Latest ${relativeTime(latest)}`:"No submissions yet"}</span></div></div>
      <div className="header-actions"><button className="button primary" onClick={()=>download("csv")} disabled={!!exporting||!canExportCsv} title={allVersions?"Select a specific version to export CSV":"Export CSV"}><Download/> {exporting.startsWith("csv")?"Exporting...":"CSV"}</button><button className="button secondary" onClick={()=>download("excel")} disabled={!!exporting||!canExport}><Download/> Excel</button><button className="button secondary" onClick={()=>download("pdf")} disabled={!!exporting||!canExport}><Download/> PDF</button></div>
    </header>

    {error&&<div className="notice error">{error}</div>}
    {versionUnavailable&&<div className="notice error">Selected version is unavailable.</div>}
    <section className="version-selector-panel card" aria-label="Version selection">
      <label>Version view<select value={allVersions?"all":requestedVersion} onChange={event=>chooseVersion(event.target.value)}><option value="all">All Versions — {selectedResponseCount} responses</option>{[...versions].sort((a,b)=>Number(b.version_number||0)-Number(a.version_number||0)).map(version=><option value={version.id} key={version.id}>Version {version.version_number} — {versionCount(version)} responses</option>)}</select></label>
      <span className="compare-action-wrapper" title={comparableVersions.length<2?"At least two published versions are required.":"Compare two published versions"}>
        <button className="button secondary" type="button" onClick={openCompare} disabled={comparableVersions.length<2} aria-label={comparableVersions.length<2?"Compare Versions unavailable. At least two published versions are required.":"Compare Versions"}><BarChart3/> Compare Versions</button>
      </span>
      <div className="version-shortcuts"><button className={allVersions?"active":""} onClick={()=>chooseVersion("all")}>All Versions</button>{latestVersions.map(version=><button key={version.id} className={String(version.id)===String(requestedVersion)?"active":""} onClick={()=>chooseVersion(version.id)}>V{version.version_number}</button>)}</div>
    </section>
    {allVersions&&<div className="notice info">All Versions includes responses from every published version. Select a specific version to export CSV.</div>}

    {allVersions&&<section className="version-summary-grid modern">{versions.map(version=><article className="card version-summary-card" key={version.id}><span><Layers3/></span><div><strong>Version {version.version_number}</strong><small>Published {version.created_at?new Date(version.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric"}):"Date unavailable"} • {version.field_count||0} fields</small></div><div className="version-response-bar"><i style={{width:`${Math.min(100,allVersionCount?versionCount(version)/allVersionCount*100:0)}%`}}/></div><b>{versionCount(version)} responses</b><button className="button secondary" onClick={()=>chooseVersion(version.id)}>View <ArrowRight/></button></article>)}</section>}

    <section className="response-analytics-kpis">
      <article><span><Inbox/></span><strong>{selectedResponseCount}</strong><small>Total Responses</small></article>
      <article><span><Clock/></span><strong>{latest?relativeTime(latest):"No submissions yet"}</strong><small>Latest Submission</small></article>
      <article><span><TrendingUp/></span><strong>{allVersions?versions.length:(selectedVersion?.field_count||0)}</strong><small>{allVersions?"Published Versions":"Fields in Version"}</small></article>
      <article><span><Paperclip/></span><strong>{uploadCount}</strong><small>Files Uploaded</small></article>
    </section>

    <section className="response-intelligence-grid">
      <article className="card response-insights-card"><div className="dashboard-card-heading"><div><h2>Response Insights</h2><p>Quick version intelligence</p></div><BarChart3/></div><div className="insight-metric-list"><div><span>Most active version</span><strong>{mostActive?`Version ${mostActive.version_number}`:"No response data"}</strong></div><div><span>Latest submission</span><strong>{latest?relativeTime(latest):"No submissions yet"}</strong></div><div><span>Average completion time</span><strong>~{Math.max(1,Math.ceil((selectedVersion?.field_count||5)*0.35))} min</strong></div><div><span>Upload count</span><strong>{uploadCount}</strong></div></div></article>
      <article className="card response-chart-card"><div className="dashboard-card-heading"><div><h2>Responses Over Time</h2><p>Daily submission activity</p></div><FileText/></div><div className="response-trend-chart">{chartData.length?<ResponsiveContainer width="100%" height={220}><AreaChart data={chartData}><defs><linearGradient id="responsesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#635bff" stopOpacity={0.24}/><stop offset="95%" stopColor="#635bff" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#98a2b3"}}/><Tooltip/><Area type="monotone" dataKey="responses" stroke="#635bff" strokeWidth={3} fill="url(#responsesArea)"/></AreaChart></ResponsiveContainer>:<div className="dashboard-empty">No trend data yet.</div>}</div></article>
    </section>

    {!allVersions&&selectedVersion&&<section className="version-analytics-strip"><strong>Version {selectedVersion.version_number}</strong><span>Responses: {versionCount(selectedVersion)}</span><span>Fields: {selectedVersion.field_count||0}</span><span>Published: {selectedVersion.created_at?new Date(selectedVersion.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric"}):"—"}</span><span>Latest Response: {latest?relativeTime(latest):"—"}</span></section>}

    <section className="card table-card modern-response-table"><div className="table-heading"><div><h2>Responses</h2><p>{selectedVersion?`Version ${selectedVersion.version_number} response stream`:"All version response stream"}</p></div></div>{loading?<div className="loading-row">Loading responses...</div>:data.items.length?<table><thead><tr><th>Response ID</th><th>Submitted</th><th>Version</th><th>Files</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.items.map(response=><tr key={response.id}><td><strong>#{response.id}</strong></td><td>{relativeTime(response.submitted_at)}</td><td>V{response.version_number||"Legacy"}</td><td>{countFiles(response)}</td><td><span className="status published">Submitted</span></td><td><div className="row-actions"><button onClick={()=>openPreview(response)}><Eye/> Preview</button><Link to={`${response.id}`}>Open</Link></div></td></tr>)}</tbody></table>:<div className="empty-state"><h2>No responses yet</h2><p>This version has not received any submissions.</p></div>}</section>

    {compareOpen&&<aside className="response-preview-backdrop" onClick={()=>setCompareOpen(false)}><section className="version-compare-modal" onClick={event=>event.stopPropagation()}><button className="preview-close" onClick={()=>setCompareOpen(false)} aria-label="Close version comparison"><X/></button><span className="eyebrow">Version comparison</span><h2>Compare Versions</h2><div className="compare-select-grid"><label>Base Version<select value={compareBase} onChange={event=>setCompareBase(event.target.value)}>{comparableVersions.map(version=><option key={version.id} value={version.id} disabled={String(version.id)===String(compareTarget)}>Version {version.version_number}</option>)}</select></label><label>Compare With<select value={compareTarget} onChange={event=>setCompareTarget(event.target.value)}>{comparableVersions.map(version=><option key={version.id} value={version.id} disabled={String(version.id)===String(compareBase)}>Version {version.version_number}</option>)}</select></label></div>{compareError&&<div className="notice error">{compareError}</div>}<button className="button primary full" onClick={runCompare} disabled={compareLoading||!compareBase||!compareTarget||String(compareBase)===String(compareTarget)}>{compareLoading?"Comparing...":"Compare Versions"}</button>{compareResult&&<div className="compare-results"><div className="compare-summary-grid">{["base","target"].map(key=><article key={key}><span>{key==="base"?"Base":"Compare"}</span><strong>Version {compareResult[key].version_number}</strong><small>Published {compareResult[key].published_at?new Date(compareResult[key].published_at).toLocaleDateString():"Date unavailable"}</small><b>{compareResult[key].response_count} responses</b><small>Latest: {compareResult[key].latest_submission?relativeTime(compareResult[key].latest_submission):"No submissions"}</small><small>{compareResult[key].field_count} fields • {compareResult[key].files_uploaded} files • ~{compareResult[key].average_completion_time} min</small></article>)}</div><div className="compare-change-list"><h3>Changes</h3>{!compareResult.changes.added.length&&!compareResult.changes.removed.length&&!compareResult.changes.changed.length?<p className="muted">No structural changes were found between these versions.</p>:<><section><h4>Added</h4>{compareResult.changes.added.length?compareResult.changes.added.map(item=><p key={item.field_id} className="change-added">+ {item.label}</p>):<p className="muted">No fields added.</p>}</section><section><h4>Removed</h4>{compareResult.changes.removed.length?compareResult.changes.removed.map(item=><p key={item.field_id} className="change-removed">- {item.label}</p>):<p className="muted">No fields removed.</p>}</section><section><h4>Changed</h4>{compareResult.changes.changed.length?compareResult.changes.changed.map(item=><div className="changed-field" key={item.field_id}><strong>{item.label}</strong>{item.changes.map(change=><small key={change.type}>{change.label}: {formatCompareValue(change.before)} → {formatCompareValue(change.after)}</small>)}</div>):<p className="muted">No fields changed.</p>}</section></>}</div></div>}</section></aside>}
    {(preview||previewLoading)&&<aside className="response-preview-backdrop" onClick={()=>setPreview(null)}><section className="response-preview-drawer" onClick={event=>event.stopPropagation()}><button className="preview-close" onClick={()=>setPreview(null)} aria-label="Close response preview"><X/></button>{previewLoading&&!preview?<div className="loading-row">Loading preview...</div>:preview&&<><span className="eyebrow">Response #{preview.id}</span><h2>{preview.form_name}</h2><div className="response-meta"><span>Version {preview.version_number}</span><span>{new Date(preview.submitted_at).toLocaleString()}</span></div><dl className="preview-answer-list">{preview.values.map(value=><div key={value.field_id}><dt>{value.field_label||`Field ${value.field_id}`}</dt><dd><ValuePreview item={value}/></dd></div>)}</dl><Link className="button primary" to={`${preview.id}`}>Open full response</Link></>}</section></aside>}
  </main>;
}


