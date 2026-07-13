import {useCallback,useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {BarChart3,FilePlus2,FileText,ListTree} from "lucide-react";
import API from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import {useToast} from "../components/ToastProvider";
import {apiMessage} from "../utils/errors";

const relative=date=>{
  if(!date)return "Recently";
  const seconds=Math.floor((Date.now()-new Date(date))/1000);
  if(seconds<3600)return `${Math.max(1,Math.floor(seconds/60))} min ago`;
  if(seconds<86400)return `${Math.floor(seconds/3600)} hrs ago`;
  if(seconds<172800)return "Yesterday";
  return new Date(date).toLocaleDateString();
};

const normalizeStatus=status=>(status||"").toLowerCase();

export default function MyForms(){
  const [params,setParams]=useSearchParams();
  const [forms,setForms]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [search,setSearch]=useState("");
  const [menu,setMenu]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const status=params.get("status")||"";
  const toast=useToast();

  const setStatus=value=>setParams(value?{status:value}:{});
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const {data}=await API.get("/forms/",{params:{page:1,page_size:100,search:search||undefined,status:status||undefined}});
      setForms(data.items||data);
    }catch(error){toast.error(apiMessage(error,"Unable to load forms"))}
    finally{setLoading(false)}
  },[search,status,toast]);

  useEffect(()=>{const id=setTimeout(load,200);return()=>clearTimeout(id)},[load]);

  const action=async(name,request,success)=>{
    setBusy(name);
    setMenu(null);
    try{
      const {data}=await request();
      toast.success(success);
      await load();
      return data;
    }catch(error){
      toast.error(apiMessage(error,`Failed to ${name}`));
      return null;
    }finally{setBusy("")}
  };

  const share=async form=>{
    const data=await action("generate link",()=>API.post(`/forms/${form.id}/generate-link`),"Link Generated Successfully");
    if(data){
      await navigator.clipboard.writeText(`${location.origin}/f/${data.link_token}`);
      toast.success("Share link copied to clipboard");
    }
  };

  const restore=form=>action("restore form",()=>API.post(`/forms/${form.id}/restore`),"Form Restored Successfully");

  const confirmAction=async()=>{
    const item=confirm;
    if(!item)return;
    if(item.type==="delete")await action("delete form",()=>API.delete(`/forms/${item.form.id}`),"Form Deleted Successfully");
    else await action("archive form",()=>API.post(`/forms/${item.form.id}/archive`),"Form Archived Successfully");
    setConfirm(null);
  };

  const tabs=[["","All Forms"],["draft","Drafts"],["published","Published"],["archived","Archived"]];

  return <main className="page-shell forms-page">
    <header className="user-page-header">
      <div><span className="eyebrow">Workspace</span><h1>Forms</h1><p>Create, publish, and share your forms.</p></div>
      <Link className="button primary" to="/create-form"><FilePlus2/> Create Form</Link>
    </header>
    <div className="forms-controls">
      <div className="status-tabs">{tabs.map(([value,label])=><button className={status===value?"active":""} onClick={()=>setStatus(value)} key={label}>{label}</button>)}</div>
      <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search forms..." aria-label="Search forms"/>
    </div>
    {loading?<section className="form-card-grid">{[1,2,3].map(i=><div className="skeleton card" key={i}/>)}</section>:forms.length?<section className="form-card-grid">{forms.map(form=>{
      const fieldsCount=form.fields_count ?? form.fields?.length ?? 0;
      const currentStatus=normalizeStatus(form.status);
      const isDraft=currentStatus==="draft";
      const isPublished=currentStatus==="published";
      const isArchived=currentStatus==="archived";
      return <article className="form-workspace-card" key={form.id}>
        <div className="form-card-top"><span className="form-glyph"><FileText/></span><span className={`status ${currentStatus}`}>{form.status}</span></div>
        <h2>{form.title}</h2>
        <p>{form.description||"No description provided."}</p>
        <div className="form-card-meta"><span><ListTree/><strong>{fieldsCount}</strong> Fields</span><span><BarChart3/><strong>{form.response_count||0}</strong> Responses</span><span>Updated {relative(form.updated_at)}</span></div>
        <div className="form-card-actions">
          <Link className="button secondary" to={`/forms/${form.id}/builder`}>Open Builder</Link>
          <Link className="button ghost" to={`/responses/forms/${form.id}`}>Responses</Link>
          <div className="action-menu-wrap">
            <button className="more-button" onClick={()=>setMenu(menu===form.id?null:form.id)} aria-label={`Actions for ${form.title}`}>⋮</button>
            {menu===form.id&&<div className="action-menu">
              {(isDraft||isPublished)&&<Link to={`/forms/${form.id}/builder`} onClick={()=>setMenu(null)}>Edit form details</Link>}
              {isDraft&&<button onClick={()=>action("publish form",()=>API.post(`/forms/${form.id}/publish`),"Form Published Successfully")}>Publish</button>}
              {isPublished&&<><button onClick={()=>share(form)}>Share</button><button onClick={()=>{setMenu(null);setConfirm({type:"archive",form})}}>Archive</button></>}
              {isArchived&&<button onClick={()=>restore(form)}>Restore</button>}
              <button className="danger" onClick={()=>{setMenu(null);setConfirm({type:"delete",form})}}>Delete</button>
            </div>}
          </div>
        </div>
      </article>;
    })}</section>:<div className="card empty-state"><h2>No forms found</h2><p>Create your first form or choose another status.</p><Link className="button primary" to="/create-form">Create your first form</Link></div>}
    <ConfirmModal open={!!confirm} title={confirm?.type==="delete"?"Delete form?":"Archive form?"} message={confirm?.type==="delete"?`"${confirm?.form.title}" will be removed from your workspace.`:`Archive "${confirm?.form.title}"? Its active public link will become unavailable.`} busy={!!busy} confirmLabel={confirm?.type==="delete"?"Delete Form":"Archive Form"} busyLabel={confirm?.type==="delete"?"Deleting...":"Archiving..."} danger={confirm?.type==="delete"} onConfirm={confirmAction} onCancel={()=>setConfirm(null)}/>
  </main>;
}
