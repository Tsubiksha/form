import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {Activity,AlertTriangle,ArrowRight,BarChart3,CheckCircle2,Clipboard,Clock,FilePlus2,FileText,Inbox,Layers3,Link2,TrendingUp} from "lucide-react";
import {Area,AreaChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import API from "../services/api";
import {useAuth} from "../auth/AuthContext";
import {useToast} from "../components/ToastProvider";
import {apiMessage} from "../utils/errors";
import {relativeTime} from "../utils/relativeTime";

const plural=(count,singular,pluralWord=`${singular}s`)=>`${count} ${count===1?singular:pluralWord}`;
const titleCase=value=>String(value||"").replace(/_/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());
const trendTotal=items=>(items||[]).reduce((sum,item)=>sum+Number(item.responses||0),0);
const newest=(items,field)=>[...(items||[])].filter(item=>item?.[field]).sort((a,b)=>new Date(b[field])-new Date(a[field]));

function EmptyCard({children,action}){return <div className="dashboard-empty insight-empty"><p>{children}</p>{action}</div>}
function MetricRow({label,value,Icon}){return <div className="insight-metric-row"><span><Icon/></span><p>{label}</p><strong>{value}</strong></div>}
function DashboardCard({title,subtitle,Icon,children,className=""}){return <article className={`user-panel dashboard-card ${className}`}><div className="user-panel-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{Icon&&<Icon/>}</div>{children}</article>}

export default function Dashboard(){
  const {user}=useAuth()||{};
  const toast=useToast();
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const [trendRange,setTrendRange]=useState("7");
  const [copied,setCopied]=useState(false);
  useEffect(()=>{API.get("/dashboard/me").then(response=>setData(response.data)).catch(error=>setError(apiMessage(error,"Unable to load dashboard")))},[]);

  const recentForms=data?.recent_forms||[];
  const recentResponses=data?.recent_responses||[];
  const publishedForms=data?.published_forms_list||[];
  const shareLinks=data?.active_share_link_items||[];
  const draft=useMemo(()=>newest(recentForms.filter(form=>form.status==="draft"),"updated_at")[0]||data?.draft_progress,[recentForms,data]);
  const topForm=data?.top_performing_form;
  const trendData=trendRange==="30"?(data?.response_trend_30||[]):(data?.response_trend||[]);
  const trendResponses=trendTotal(trendData);
  const peakDay=trendData.filter(item=>Number(item.responses||0)>0).sort((a,b)=>Number(b.responses||0)-Number(a.responses||0))[0];
  const shareLink=shareLinks[0];

  const heroSummary=useMemo(()=>{
    if(!data)return "";
    if(data.total_forms===0)return "Create your first form and start collecting responses.";
    if(data.draft_forms>0&&data.published_forms===0)return `You have ${plural(data.draft_forms,"draft form")} ready to finish.`;
    if(data.published_forms>0&&data.total_responses===0)return "Your forms are live and waiting for responses.";
    if(data.total_responses>0)return `You received ${plural(data.total_responses,"response")} across your published forms.`;
    return "Your workspace is ready for the next form.";
  },[data]);

  const stats=useMemo(()=>data&&[
    {label:"Total Forms",value:data.total_forms,Icon:Layers3,tone:"violet",support:data.weekly_overview?.forms_created>0?`+${data.weekly_overview.forms_created} this week`:""},
    {label:"Published Forms",value:data.published_forms,Icon:CheckCircle2,tone:"green",support:data.weekly_overview?.forms_published>0?`+${data.weekly_overview.forms_published} this week`:""},
    {label:"Draft Forms",value:data.draft_forms,Icon:FileText,tone:"blue",support:data.draft_forms>0?`${plural(data.draft_forms,"draft form")} in progress`:""},
    {label:"Total Responses",value:data.total_responses,Icon:Inbox,tone:"amber",support:data.responses_this_week>0?`+${data.responses_this_week} this week`:""},
  ],[data]);

  const recentActivity=useMemo(()=>{
    if(!data)return [];
    const events=[
      ...recentResponses.map(item=>({type:"response",title:"Response received",form:item.form_title,time:item.submitted_at,Icon:Inbox})),
      ...recentForms.filter(item=>item.updated_at).map(item=>({type:"form",title:item.status==="draft"?"Draft updated":"Form updated",form:item.title,time:item.updated_at,Icon:FileText})),
      ...publishedForms.filter(item=>item.published_at).map(item=>({type:"publish",title:"Form published",form:item.title,time:item.published_at,Icon:CheckCircle2})),
      ...shareLinks.filter(item=>item.created_at).map(item=>({type:"share",title:"Share link active",form:item.form_title,time:item.created_at,Icon:Link2})),
    ];
    return events.sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,5);
  },[data,recentResponses,recentForms,publishedForms,shareLinks]);

  const copyLink=async()=>{
    if(!shareLink?.share_url)return;
    try{
      await navigator.clipboard.writeText(`${window.location.origin}${shareLink.share_url}`);
      setCopied(true);
      toast.success("Copied");
      setTimeout(()=>setCopied(false),1400);
    }catch{toast.error("Copy failed. Open the form and copy the link manually.")}
  };

  if(!data&&!error)return <main className="page-shell user-dashboard polished-dashboard"><div className="skeleton dashboard-hero-skeleton"/><div className="skeleton-grid">{[1,2,3,4].map(i=><div className="skeleton card" key={i}/>)}</div></main>;

  return <main className="page-shell user-dashboard polished-dashboard workspace-home insight-dashboard">
    {error&&<div className="notice error">{error}</div>}
    {data&&<>
      <header className="workspace-hero dashboard-hero-compact"><div><span className="eyebrow">Workspace home</span><h1>{data.total_forms?`Welcome back, ${user?.name||"there"}`:"Welcome to FormFlow"}</h1><p>{heroSummary}</p></div><Link className="button primary" to="/create-form"><FilePlus2/> Create Form</Link></header>
      <section className="user-kpi-grid dashboard-stat-grid">{stats.map(({label,value,Icon,tone,support})=><article className={`user-kpi dashboard-stat-card ${tone}`} key={label}><span><Icon/></span><div><strong>{value}</strong><small>{label}</small>{support&&<em>{support}</em>}</div></article>)}</section>
      {data.total_forms===0?<section className="card dashboard-empty hero-empty"><h2>No forms created yet.</h2><p>Create your first form to get started.</p><Link className="button primary" to="/create-form">Create Form</Link></section>:<>
        <section className="insight-grid two dashboard-priority-grid">
          <DashboardCard title="Top Performing Form" subtitle="Your strongest response driver" Icon={TrendingUp} className="top-performing-card">
            {topForm&&topForm.response_count>0?<div className="top-insight featured-top-form"><span className="top-form-icon"><BarChart3/></span><strong>{topForm.title}</strong><div className="insight-stat-pair"><span>{plural(topForm.response_count,"response")}</span>{topForm.latest_response&&<span>Last response {relativeTime(topForm.latest_response)}</span>}<span className={`status ${topForm.status}`}>{titleCase(topForm.status)}</span></div><Link className="button primary" to={`/responses/forms/${topForm.id}`}>View Analytics <ArrowRight/></Link></div>:<EmptyCard action={<Link className="button secondary" to="/forms">View Forms</Link>}>No response data yet. Publish and share a form to see performance insights.</EmptyCard>}
          </DashboardCard>
          <DashboardCard title="Recent Activity" subtitle="Latest workspace movement" Icon={Activity}>
            {recentActivity.length?<div className="recent-activity-list">{recentActivity.map((item,index)=>{const Icon=item.Icon;return <div key={`${item.type}-${index}`}><span><Icon/></span><div><strong>{item.title}</strong><small>{item.form}</small></div><time>{relativeTime(item.time)}</time></div>})}</div>:<EmptyCard>No recent activity yet.</EmptyCard>}
          </DashboardCard>
        </section>
        <section className="insight-grid two">
          <DashboardCard title="Continue Working" subtitle="Most recently edited draft" Icon={Clock}>
            {draft?<div className="draft-progress-card compact-draft-card"><strong>{draft.title}</strong><span className="status draft">Draft</span><small>Last updated {relativeTime(draft.updated_at)}</small>{"progress" in draft&&<><div className="dashboard-progress large"><i style={{width:`${draft.progress}%`}}/></div><small>{draft.progress}% configured</small></>}<Link className="button secondary" to={`/forms/${draft.id}/builder`}>Open Builder</Link></div>:<EmptyCard action={<Link className="button secondary" to="/create-form">Create Form</Link>}>No drafts in progress.</EmptyCard>}
          </DashboardCard>
          <DashboardCard title="Response Trend" subtitle={`Last ${trendRange} days`} Icon={BarChart3} className="trend-panel compact-trend-panel">
            <div className="trend-card-summary"><span><strong>{trendResponses}</strong> {trendResponses===1?"response":"responses"}</span>{peakDay&&<span>Peak: {peakDay.date} · {peakDay.responses}</span>}<div className="trend-toggle"><button className={trendRange==="7"?"active":""} onClick={()=>setTrendRange("7")}>7 days</button><button className={trendRange==="30"?"active":""} onClick={()=>setTrendRange("30")}>30 days</button></div></div>
            {trendResponses>0&&trendData.length>1?<div className="user-trend-chart compact"><ResponsiveContainer width="100%" height={170}><AreaChart data={trendData} margin={{top:8,right:8,left:-24,bottom:0}}><defs><linearGradient id="responseTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#635bff" stopOpacity={0.28}/><stop offset="95%" stopColor="#635bff" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#98a2b3"}}/><YAxis hide domain={[0,"dataMax"]}/><Tooltip/><Area type="monotone" dataKey="responses" stroke="#635bff" strokeWidth={3} fill="url(#responseTrend)"/></AreaChart></ResponsiveContainer></div>:<EmptyCard> No response trend yet. Responses will appear here after form submissions.</EmptyCard>}
          </DashboardCard>
        </section>
        <section className="insight-grid two">
          <DashboardCard title="Draft Progress" subtitle="Nearest unpublished form" Icon={AlertTriangle}>
            {data.draft_progress?<div className="draft-progress-card"><strong>{data.draft_progress.title}</strong><MetricRow label="Fields Created" value={data.draft_progress.field_count} Icon={Layers3}/><MetricRow label="Required Fields" value={data.draft_progress.required_field_count} Icon={CheckCircle2}/><MetricRow label="Status" value={titleCase(data.draft_progress.status)} Icon={FileText}/><div className="dashboard-progress large"><i style={{width:`${data.draft_progress.progress}%`}}/></div><small>{data.draft_progress.progress}% configured</small><Link className="button secondary" to={`/forms/${data.draft_progress.id}/builder`}>Continue Editing</Link></div>:<EmptyCard>No draft forms available.</EmptyCard>}
          </DashboardCard>
          <DashboardCard title="Active Share Links" subtitle="Live collection status" Icon={Link2}>
            {shareLink?<div className="share-link-status-card"><strong>{shareLink.form_title}</strong><MetricRow label="Status" value={shareLink.status} Icon={CheckCircle2}/><MetricRow label="Responses" value={shareLink.responses} Icon={Inbox}/><MetricRow label="Created" value={relativeTime(shareLink.created_at)} Icon={Clock}/><button className="button secondary" onClick={copyLink} aria-label={`Copy share link for ${shareLink.form_title}`}><Clipboard/> {copied?"Copied":"Copy Link"}</button></div>:<EmptyCard action={<Link className="button secondary" to="/forms">View Forms</Link>}>No active share links.</EmptyCard>}
          </DashboardCard>
        </section>
      </>}
    </>}
  </main>;
}
