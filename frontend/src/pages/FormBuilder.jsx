import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Link,useNavigate,useParams} from "react-router-dom";
import API from "../services/api";
import {DndContext,KeyboardSensor,PointerSensor,closestCenter,useSensor,useSensors} from "@dnd-kit/core";
import {SortableContext,arrayMove,sortableKeyboardCoordinates,useSortable,verticalListSortingStrategy} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {AtSign,CalendarDays,CheckSquare,ChevronDown,ChevronUp,FileText,GripVertical,Hash,ListChecks,ListTree,Mail,MoreHorizontal,PanelTop,Plus,Settings,Share2,Star,Trash2,Type} from "lucide-react";
import {useToast} from "../components/ToastProvider";
import ConfirmModal from "../components/ConfirmModal";

const FILE_TYPES=["pdf","docx","png","jpg","jpeg"];
const OPTION_TYPES=["dropdown","radio","multi_select","checkbox_group"];
const FIELD_DEFS=[
  {type:"text",name:"Text",defaultLabel:"Untitled text field",description:"Single-line answer",Icon:Type},
  {type:"email",name:"Email",defaultLabel:"Email address",description:"Validated email address",Icon:Mail},
  {type:"number",name:"Number",defaultLabel:"Number",description:"Numeric input",Icon:Hash},
  {type:"textarea",name:"Textarea",defaultLabel:"Long answer",description:"Long-form response",Icon:FileText},
  {type:"date",name:"Date",defaultLabel:"Date",description:"Calendar date input",Icon:CalendarDays},
  {type:"checkbox",name:"Checkbox",defaultLabel:"Checkbox",description:"Single yes/no choice",Icon:CheckSquare},
  {type:"dropdown",name:"Dropdown",defaultLabel:"Dropdown",description:"Choose one option",Icon:ChevronDown},
  {type:"radio",name:"Radio",defaultLabel:"Radio choice",description:"Choose one visible option",Icon:PanelTop},
  {type:"multi_select",name:"Multi Select",defaultLabel:"Multi select",description:"Choose multiple options",Icon:ListChecks},
  {type:"checkbox_group",name:"Checkbox Group",defaultLabel:"Checkbox group",description:"Multiple checkbox choices",Icon:ListTree},
  {type:"file",name:"File Upload",defaultLabel:"File upload",description:"Upload documents or images",Icon:AtSign},
  {type:"rating",name:"Rating",defaultLabel:"Rating",description:"Collect a score or satisfaction rating",Icon:Star},
];
const FIELD_LABELS=Object.fromEntries(FIELD_DEFS.map(item=>[item.type,item.name]));
const FIELD_DEFAULTS=Object.fromEntries(FIELD_DEFS.map(item=>[item.type,item.defaultLabel]));
const messageFrom=(error,fallback)=>error.response?.data?.error?.message||error.response?.data?.detail||error.message||fallback;

function SortableField({id,children}) {
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id});
  const style={transform:CSS.Transform.toString(transform),transition,opacity:isDragging?.65:1,zIndex:isDragging?10:"auto"};
  return <div ref={setNodeRef} className={`canvas-sortable ${isDragging?"is-dragging":""}`} style={style}>
    {children({attributes,listeners,setActivatorNodeRef,isDragging})}
  </div>;
}

function FieldLibrary({onDragStart,onAdd}) {
  const [query,setQuery]=useState("");
  const fields=FIELD_DEFS.filter(item=>`${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className="builder-library card" aria-label="Field Library">
    <div className="builder-panel-title"><h2>Field Library</h2><p>Drag into the canvas or click to add.</p></div>
    <input className="builder-library-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search fields..." aria-label="Search field types"/>
    <div className="builder-library-list">{fields.map(({type,name,description,Icon})=><button className="library-field" key={type} type="button" draggable onDragStart={event=>onDragStart(event,type)} onClick={()=>onAdd(type)}><span><Icon/></span><strong>{name}</strong><small>{description}</small></button>)}</div>
  </aside>;
}

function AddFieldSheet({open,onClose,onAdd,busy}) {
  const [type,setType]=useState("text");
  if(!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <form className="card add-field-modal" role="dialog" aria-modal="true" aria-labelledby="add-field-title" onSubmit={async event=>{event.preventDefault();if(await onAdd(type))onClose()}}>
      <div className="section-heading"><div><h2 id="add-field-title">Add Field</h2><p>Choose a field type to add to your form.</p></div></div>
      <label>Field type<select value={type} onChange={event=>setType(event.target.value)}>{FIELD_DEFS.map(item=><option value={item.type} key={item.type}>{item.name}</option>)}</select></label>
      <div className="form-actions"><button className="button ghost" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={!!busy}>{busy==="add"?"Adding...":"Add Field"}</button></div>
    </form>
  </div>;
}

function RuleControl({field,ruleType,label,type="text",placeholder,reload,onSaved,withErrorMessage=false,helper}) {
  const existing=(field.validation_rules||[]).find(rule=>rule.rule_type===ruleType);
  const [value,setValue]=useState(existing?.rule_value||"");
  const [errorMessage,setErrorMessage]=useState(existing?.error_message||"");
  useEffect(()=>{setValue(existing?.rule_value||"");setErrorMessage(existing?.error_message||"")},[existing?.id,existing?.rule_value,existing?.error_message]);
  const save=async()=>{
    try {
      if(value===""&&existing) await API.delete(`/forms/fields/${field.id}/validation-rules/${existing.id}`);
      else if(value!==""&&existing) await API.patch(`/forms/fields/${field.id}/validation-rules/${existing.id}`,{rule_value:value,error_message:errorMessage||null});
      else if(value!=="") await API.post(`/forms/fields/${field.id}/validation-rules`,{rule_type:ruleType,rule_value:value,error_message:errorMessage||null});
      else return;
      onSaved?.("Validation saved.");
      reload();
    } catch(error) { onSaved?.(messageFrom(error,"Unable to save validation."),"error"); }
  };
  return <label>{label}<div className="rule-control"><input type={type} value={value} onChange={event=>setValue(event.target.value)} placeholder={placeholder}/><button className="button secondary" type="button" onClick={save}>Save</button></div>{withErrorMessage&&<span className="rule-error-label">Custom Error Message<input className="rule-error-input" value={errorMessage} onChange={event=>setErrorMessage(event.target.value)} placeholder="Show this message when the pattern does not match"/></span>}{helper&&<small className="rule-helper">{helper}</small>}{withErrorMessage&&value&&<small className="validation-preview">Validation preview: {errorMessage||"Invalid format"}</small>}</label>;
}

function OptionsEditor({field,formId,reload,onSaved}) {
  const [option,setOption]=useState("");
  const addOption=async event=>{
    event.preventDefault();
    if(!option.trim()) return;
    try {await API.post(`/forms/${formId}/fields/${field.id}/options`,{option_label:option.trim(),option_value:option.trim().toLowerCase().replace(/\s+/g,"_"),display_order:field.options.length});setOption("");onSaved?.("Option added.");reload()}
    catch(error){onSaved?.(messageFrom(error,"Unable to add option."),"error")}
  };
  const deleteOption=async id=>{try{await API.delete(`/forms/${formId}/fields/${field.id}/options/${id}`);onSaved?.("Option deleted.");reload()}catch(error){onSaved?.(messageFrom(error,"Unable to delete option."),"error")}};
  const editOption=async item=>{const label=prompt("Option label",item.option_label);if(!label?.trim())return;try{await API.patch(`/forms/${formId}/fields/${field.id}/options/${item.id}`,{option_label:label.trim(),option_value:label.trim().toLowerCase().replace(/\s+/g,"_")});onSaved?.("Option updated.");reload()}catch(error){onSaved?.(messageFrom(error,"Unable to update option."),"error")}};
  return <div className="settings-block"><h3>Options</h3><div className="chips">{field.options?.map(item=><span className="chip" key={item.id}>{item.option_label}<button onClick={()=>editOption(item)} aria-label={`Edit ${item.option_label}`}>Edit</button><button onClick={()=>deleteOption(item.id)} aria-label={`Delete ${item.option_label}`}>Delete</button></span>)}</div><form className="mini-form" onSubmit={addOption}><input value={option} onChange={event=>setOption(event.target.value)} placeholder="New option" required/><button className="button secondary">Add option</button></form></div>;
}

function FileSettings({field,reload,onSaved}) {
  const rules=Object.fromEntries((field.validation_rules||[]).map(rule=>[rule.rule_type,rule]));
  const selected=(rules.allowed_file_types?.rule_value?rules.allowed_file_types.rule_value.split(","):FILE_TYPES).map(item=>item.trim().toLowerCase()).filter(Boolean);
  const [maxSize,setMaxSize]=useState(rules.file_size?.rule_value||"5");
  const saveRule=async(rule_type,rule_value)=>{
    try {
      const existing=rules[rule_type];
      if(existing) await API.patch(`/forms/fields/${field.id}/validation-rules/${existing.id}`,{rule_value});
      else await API.post(`/forms/fields/${field.id}/validation-rules`,{rule_type,rule_value});
      onSaved?.("File upload settings saved.");
      reload();
    } catch(error) { onSaved?.(messageFrom(error,"Unable to save file upload settings."),"error"); }
  };
  const toggle=async type=>{const next=selected.includes(type)?selected.filter(item=>item!==type):[...selected,type];await saveRule("allowed_file_types",next.join(","))};
  return <div className="settings-block file-settings"><h3>File Upload</h3><p>Uses the existing working File Upload behavior.</p><div className="file-type-options">{FILE_TYPES.map(type=><label key={type}><input type="checkbox" checked={selected.includes(type)} onChange={()=>toggle(type)}/>{type.toUpperCase()}</label>)}</div><form className="mini-form" onSubmit={event=>{event.preventDefault();saveRule("file_size",maxSize)}}><label>Maximum size (MB)<input type="number" min="1" max="100" value={maxSize} onChange={event=>setMaxSize(event.target.value)} required/></label><button className="button secondary">Save size</button></form></div>;
}

const VALIDATION_PRESETS={
  none:{label:"None"},
  email:{label:"Email",rule:"email",value:"true"},
  phone:{label:"Phone Number",rule:"regex",value:"^[6-9]\\d{9}$",message:"Enter a valid 10-digit phone number"},
  url:{label:"URL",rule:"regex",value:"https?://.+",message:"Enter a valid URL"},
  number:{label:"Number",rule:"regex",value:"^-?\\d+(\\.\\d+)?$",message:"Enter a valid number"},
  custom:{label:"Custom Regex"},
};
function ValidationTypeControl({field,reload,onSaved}) {
  const rules=Object.fromEntries((field.validation_rules||[]).map(rule=>[rule.rule_type,rule]));
  const regexValue=rules.regex?.rule_value||"";
  const initialType=rules.email?"email":Object.entries(VALIDATION_PRESETS).find(([key,item])=>key!=="custom"&&item.rule==="regex"&&item.value===regexValue)?.[0]||(regexValue?"custom":"none");
  const [type,setType]=useState(initialType);
  const [pattern,setPattern]=useState(regexValue);
  const [message,setMessage]=useState(rules.regex?.error_message||"");
  useEffect(()=>{const next=rules.email?"email":Object.entries(VALIDATION_PRESETS).find(([key,item])=>key!=="custom"&&item.rule==="regex"&&item.value===regexValue)?.[0]||(regexValue?"custom":"none");setType(next);setPattern(regexValue);setMessage(rules.regex?.error_message||"")},[field.id,regexValue,rules.email?.id,rules.regex?.error_message]);
  const deleteRule=async rule=>{if(rule)await API.delete(`/forms/fields/${field.id}/validation-rules/${rule.id}`)};
  const upsertRule=async(ruleType,ruleValue,errorMessage=null)=>{
    const existing=rules[ruleType];
    const payload={rule_type:ruleType,rule_value:ruleValue,error_message:errorMessage};
    if(existing)await API.patch(`/forms/fields/${field.id}/validation-rules/${existing.id}`,payload);
    else await API.post(`/forms/fields/${field.id}/validation-rules`,payload);
  };
  const save=async()=>{
    try{
      await deleteRule(rules.email);
      await deleteRule(rules.regex);
      if(type==="custom"){
        if(!pattern.trim())return onSaved("Regex pattern is required.","error");
        await upsertRule("regex",pattern.trim(),message.trim()||null);
      }else if(type!=="none"){
        const preset=VALIDATION_PRESETS[type];
        await upsertRule(preset.rule,preset.value,preset.message||null);
      }
      onSaved("Validation saved.");
      reload();
    }catch(error){onSaved(messageFrom(error,"Unable to save validation."),"error")}
  };
  return <div className="settings-block validation-type-card">
    <label>Validation Type
      <select value={type} onChange={event=>setType(event.target.value)}>
        {Object.entries(VALIDATION_PRESETS).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}
      </select>
    </label>
    {type==="custom"&&<>
      <label>Regex Pattern<input value={pattern} onChange={event=>setPattern(event.target.value)} placeholder="^[6-9]\\d{9}$"/></label>
      <label>Custom Error Message<input value={message} onChange={event=>setMessage(event.target.value)} placeholder="Enter a valid value"/></label>
      <small className="rule-helper">Examples: Phone ^[6-9]\d&#123;9&#125;$ · Email ^[^\s@]+@[^\s@]+\.[^\s@]+$ · PAN ^[A-Z]&#123;5&#125;[0-9]&#123;4&#125;[A-Z]&#123;1&#125;$</small>
    </>}
    <button className="button primary validation-save-button" type="button" onClick={save}>Save Validation</button>
  </div>;
}

function FieldSettings({field,formId,reload,onSaved}) {
  const [tab,setTab]=useState("general");
  const [draft,setDraft]=useState({label:field?.label||"",required:!!field?.required,placeholder:field?.placeholder||"",help_text:field?.help_text||""});
  const labelRef=useRef(null);
  useEffect(()=>{setTab("general");setDraft({label:field?.label||"",required:!!field?.required,placeholder:field?.placeholder||"",help_text:field?.help_text||""});setTimeout(()=>labelRef.current?.focus(),50)},[field?.id]);
  if(!field) return <div className="settings-empty"><Settings/><h2>Select a field</h2><p>Choose a field in the canvas to configure its settings.</p></div>;
  const saveGeneral=async event=>{
    event.preventDefault();
    if(!draft.label.trim()) return onSaved("Field label is required.","error");
    try {await API.patch(`/forms/${formId}/fields/${field.id}`,{label:draft.label.trim(),required:draft.required,placeholder:draft.placeholder,help_text:draft.help_text});onSaved("Field saved.");reload()}
    catch(error){onSaved(messageFrom(error,"Unable to save field."),"error")}
  };
  const optionField=OPTION_TYPES.includes(field.field_type);
  return <div className="settings-panel-content">
    <div className="settings-selected"><span>{FIELD_LABELS[field.field_type]}</span><h2>{field.label}</h2></div>
    <div className="settings-tabs compact"><button className={tab==="general"?"active":""} onClick={()=>setTab("general")}>General</button><button className={tab==="validation"?"active":""} onClick={()=>setTab("validation")}>Validation</button>{optionField&&<button className={tab==="options"?"active":""} onClick={()=>setTab("options")}>Options</button>}</div>
    {tab==="general"&&<form className="settings-form" onSubmit={saveGeneral}><label>Label<input ref={labelRef} value={draft.label} onChange={event=>setDraft({...draft,label:event.target.value})} required/></label>{["text","email","number","textarea","dropdown"].includes(field.field_type)&&<label>Placeholder<input value={draft.placeholder} onChange={event=>setDraft({...draft,placeholder:event.target.value})}/></label>}<label>Help Text<textarea rows="3" value={draft.help_text} onChange={event=>setDraft({...draft,help_text:event.target.value})}/></label><label className="check-label"><input type="checkbox" checked={draft.required} onChange={event=>setDraft({...draft,required:event.target.checked})}/> Required</label><button className="button primary">Save settings</button></form>}
    {tab==="validation"&&<div className="settings-form"><ValidationTypeControl field={field} reload={reload} onSaved={onSaved}/>{field.field_type==="file"&&<FileSettings field={field} reload={reload} onSaved={onSaved}/>} {field.field_type==="rating"&&<div className="settings-block rating-settings"><h3>Rating Settings</h3><RuleControl field={field} ruleType="min_value" label="Scale minimum" type="number" placeholder="1" reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="max_value" label="Scale maximum" type="number" placeholder="5" reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="rating_style" label="Display style" placeholder="stars or numbers" reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="low_label" label="Low label" placeholder="Very dissatisfied" reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="high_label" label="High label" placeholder="Very satisfied" reload={reload} onSaved={onSaved}/></div>}</div>}
    {tab==="options"&&optionField&&<OptionsEditor field={field} formId={formId} reload={reload} onSaved={onSaved}/>}
  </div>;
}

function HeaderMoreMenu({onEdit,onArchive,onDelete,busy,onOpen}) {
  const [open,setOpen]=useState(false);
  const buttonRef=useRef(null);
  const menuRef=useRef(null);
  const [position,setPosition]=useState({top:0,left:0});
  useEffect(()=>{
    if(!open)return;
    const place=()=>{
      const button=buttonRef.current;
      const menu=menuRef.current;
      if(!button||!menu)return;
      const rect=button.getBoundingClientRect();
      const width=Math.max(menu.offsetWidth||200,200);
      const height=menu.offsetHeight||150;
      const gap=8;
      const padding=10;
      let left=rect.right-width;
      if(left<padding)left=padding;
      if(left+width>window.innerWidth-padding)left=window.innerWidth-width-padding;
      let top=rect.bottom+gap;
      if(top+height>window.innerHeight-padding)top=rect.top-height-gap;
      if(top<padding)top=padding;
      setPosition({top,left});
    };
    const close=e=>{if(buttonRef.current?.contains(e.target)||menuRef.current?.contains(e.target))return;setOpen(false)};
    const escape=e=>{if(e.key==="Escape")setOpen(false)};
    place();
    window.addEventListener("resize",place);
    window.addEventListener("scroll",place,true);
    document.addEventListener("mousedown",close);
    document.addEventListener("keydown",escape);
    return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape)};
  },[open]);
  const menu=open&&createPortal(<div ref={menuRef} className="builder-action-popover" style={{top:position.top,left:position.left}} role="menu" aria-label="Form actions"><button role="menuitem" onClick={()=>{setOpen(false);onEdit()}}>Edit Details</button><button role="menuitem" onClick={()=>{setOpen(false);onArchive()}} disabled={!!busy}>Archive Form</button><span className="popover-separator"/><button role="menuitem" className="danger" onClick={()=>{setOpen(false);onDelete()}}>Delete Form</button></div>,document.body);
  const toggle=event=>{event.stopPropagation();setOpen(current=>{const next=!current;if(next)onOpen?.();return next})};
  return <div className="action-menu-wrap"><button ref={buttonRef} className="more-button" type="button" onClick={toggle} aria-label="More form actions" aria-haspopup="menu" aria-expanded={open}><MoreHorizontal/></button>{menu}</div>;
}

function FieldCardMenu({field,open,onToggle,onClose,onSelect,onDuplicate,onDelete}) {
  const buttonRef=useRef(null);
  const menuRef=useRef(null);
  const [position,setPosition]=useState({top:0,left:0});
  useEffect(()=>{
    if(!open)return;
    const place=()=>{
      const button=buttonRef.current;
      const menu=menuRef.current;
      if(!button||!menu)return;
      const rect=button.getBoundingClientRect();
      const width=Math.max(menu.offsetWidth||200,200);
      const height=menu.offsetHeight||220;
      const gap=8;
      const padding=10;
      let left=rect.right-width;
      if(left<padding)left=padding;
      if(left+width>window.innerWidth-padding)left=window.innerWidth-width-padding;
      let top=rect.bottom+gap;
      if(top+height>window.innerHeight-padding)top=rect.top-height-gap;
      if(top<padding)top=padding;
      setPosition({top,left});
    };
    const close=event=>{if(buttonRef.current?.contains(event.target)||menuRef.current?.contains(event.target))return;onClose()};
    const escape=event=>{if(event.key==="Escape")onClose()};
    place();
    window.addEventListener("resize",place);
    window.addEventListener("scroll",place,true);
    document.addEventListener("mousedown",close);
    document.addEventListener("keydown",escape);
    return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape)};
  },[open,onClose]);
  const run=action=>{onClose();action()};
  const menu=open&&createPortal(<div ref={menuRef} className="builder-action-popover field-action-popover" style={{top:position.top,left:position.left}} role="menu" aria-label={`Actions for ${field.label}`} onClick={event=>event.stopPropagation()}><button role="menuitem" onClick={()=>run(()=>onSelect(field))}>Edit</button><button role="menuitem" onClick={()=>run(()=>onDuplicate(field))}>Duplicate</button><span className="popover-separator"/><button role="menuitem" className="danger" onClick={()=>run(()=>onDelete(field))}>Delete</button></div>,document.body);
  return <div className="action-menu-wrap"><button ref={buttonRef} className="field-more-button" type="button" onClick={event=>{event.stopPropagation();onToggle(field.id)}} aria-label={`More actions for ${field.label}`} aria-haspopup="menu" aria-expanded={open}><MoreHorizontal/></button>{menu}</div>;
}

export default function FormBuilder() {
  const {formId}=useParams();
  const navigate=useNavigate();
  const [form,setForm]=useState(null);
  const [versions,setVersions]=useState([]);
  const [details,setDetails]=useState({title:"",description:""});
  const [selectedId,setSelectedId]=useState(null);
  const [rightTab,setRightTab]=useState("settings");
  const [shareUrl,setShareUrl]=useState("");
  const [notice,setNotice]=useState(null);
  const [busy,setBusy]=useState("");
  const [loading,setLoading]=useState(true);
  const [dragOver,setDragOver]=useState(false);
  const [dropIndex,setDropIndex]=useState(null);
  const [activeDragId,setActiveDragId]=useState(null);
  const [overDragId,setOverDragId]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [showDetails,setShowDetails]=useState(false);
  const [showAllVersions,setShowAllVersions]=useState(false);
  const [openFieldMenuId,setOpenFieldMenuId]=useState(null);
  const fieldRefs=useRef({});
  const toast=useToast();
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));

  const loadData=useCallback(async()=>{
    try{const [formResponse,versionResponse]=await Promise.all([API.get(`/forms/${formId}`),API.get(`/forms/${formId}/versions`)]);setForm(formResponse.data);setVersions(Array.isArray(versionResponse.data)?versionResponse.data:[])}
    catch(error){setNotice({type:"error",text:messageFrom(error,"The form could not be loaded.")})}
    finally{setLoading(false)}
  },[formId]);
  useEffect(()=>{loadData()},[loadData]);
  const fields=form?.fields||[];
  const selectedField=useMemo(()=>fields.find(field=>field.id===selectedId)||null,[fields,selectedId]);
  const visibleVersions=showAllVersions?versions:versions.slice(0,5);
  const flash=(text,type="success")=>{setNotice({type,text});type==="error"?toast.error(text):toast.success(text)};
  const closeFieldMenu=useCallback(()=>setOpenFieldMenuId(null),[]);
  const toggleFieldMenu=id=>setOpenFieldMenuId(currentId=>currentId===id?null:id);
  const selectField=id=>{closeFieldMenu();setSelectedId(id);setRightTab("settings");window.requestAnimationFrame(()=>fieldRefs.current[id]?.scrollIntoView({behavior:"smooth",block:"center"}))};

  const createField=async(type,label=FIELD_DEFAULTS[type],index=fields.length)=>{
    setBusy("add");
    try{const {data:newField}=await API.post(`/forms/${formId}/fields`,{label,field_type:type,required:false,display_order:fields.length+1});const target=Math.max(0,Math.min(index,fields.length));if(target<fields.length){const next=[...fields];next.splice(target,0,newField);await API.patch(`/forms/${formId}/fields/reorder`,{fields:next.map((field,i)=>({field_id:field.id,display_order:i+1}))})}await loadData();setSelectedId(newField.id);setRightTab("settings");window.requestAnimationFrame(()=>fieldRefs.current[newField.id]?.scrollIntoView({behavior:"smooth",block:"center"}));flash(`${FIELD_LABELS[type]} field added`);return true}
    catch(error){flash(messageFrom(error,"Unable to add field. Please try again."),"error");return false}
    finally{setBusy("");setDragOver(false);setDropIndex(null)}
  };
  const duplicateField=async field=>{const ok=await createField(field.field_type,`${field.label} copy`,fields.findIndex(item=>item.id===field.id)+1);return ok};
  const reorderFields=async(next,previous=fields)=>{const ordered=next.map((field,index)=>({...field,display_order:index+1}));setForm(current=>({...current,fields:ordered}));try{await API.patch(`/forms/${formId}/fields/reorder`,{fields:ordered.map(field=>({field_id:field.id,display_order:field.display_order}))});toast.success("Fields reordered successfully.");await loadData()}catch(error){setForm(current=>({...current,fields:previous}));toast.error("Unable to reorder fields. Please try again.")}};
  const handleDragStart=({active})=>{closeFieldMenu();setActiveDragId(active.id);setOverDragId(active.id)};
  const handleDragOver=({over})=>setOverDragId(over?.id??null);
  const clearDragState=()=>{setActiveDragId(null);setOverDragId(null)};
  const handleDragEnd=async({active,over})=>{closeFieldMenu();clearDragState();if(!over||String(active.id)===String(over.id))return;const oldIndex=fields.findIndex(item=>String(item.id)===String(active.id));const newIndex=fields.findIndex(item=>String(item.id)===String(over.id));if(oldIndex<0||newIndex<0||oldIndex===newIndex)return;await reorderFields(arrayMove(fields,oldIndex,newIndex),fields)};
  const dragIndicatorClass=field=>{if(!activeDragId||!overDragId||String(overDragId)!==String(field.id)||String(activeDragId)===String(field.id))return "";const activeIndex=fields.findIndex(item=>String(item.id)===String(activeDragId));const overIndex=fields.findIndex(item=>String(item.id)===String(overDragId));if(activeIndex<0||overIndex<0)return "";return activeIndex<overIndex?"drop-after":"drop-before"};
  const deleteField=async field=>{closeFieldMenu();if(!window.confirm(`Delete "${field.label}"? This cannot be undone.`))return;try{await API.delete(`/forms/${formId}/fields/${field.id}`);if(selectedId===field.id)setSelectedId(null);flash("Field deleted.");await loadData()}catch(error){toast.error(messageFrom(error,"Unable to delete field. Please try again."))}};
  const publish=async()=>{setBusy("publish");try{const {data}=await API.post(`/forms/${formId}/publish`);flash(`Form published successfully - version ${data.version_number}.`);await loadData()}catch(error){toast.error(messageFrom(error,"Unable to publish the form. Please try again."))}finally{setBusy("")}};
  const archive=async()=>{setBusy("archive");try{await API.post(`/forms/${formId}/archive`);flash("Form archived.");await loadData()}catch(error){toast.error(messageFrom(error,"Unable to archive the form. Please try again."))}finally{setBusy("")}};
  const deleteForm=async()=>{setBusy("delete-form");try{await API.delete(`/forms/${formId}`);toast.success("Form deleted.");navigate("/forms",{replace:true})}catch(error){toast.error(messageFrom(error,"Unable to delete form."))}finally{setBusy("");setConfirmDelete(false)}};
  const generateLink=async()=>{setBusy("share");try{const {data}=await API.post(`/forms/${formId}/generate-link`);setShareUrl(`${window.location.origin}/f/${data.link_token}`);flash("Share link generated.")}catch(error){toast.error(messageFrom(error,"Unable to generate share link. Publish the form first."))}finally{setBusy("")}};
  const copyLink=async()=>{try{await navigator.clipboard.writeText(shareUrl);flash("Link copied to clipboard.")}catch{toast.error("Copy failed. Select the link and copy it manually.")}};
  const saveDetails=async event=>{event.preventDefault();if(!details.title.trim())return toast.error("Form title is required.");try{await API.patch(`/forms/${formId}`,{title:details.title.trim(),description:details.description});flash("Form details updated.");setShowDetails(false);await loadData()}catch(error){toast.error(messageFrom(error,"Unable to update form details."))}};
  const startDetails=()=>{setDetails({title:form.title,description:form.description||""});setShowDetails(true)};
  const dragStart=(event,type)=>{closeFieldMenu();event.dataTransfer.effectAllowed="copy";event.dataTransfer.setData("application/x-formflow-field-type",type)};
  const dropField=event=>{const type=event.dataTransfer.getData("application/x-formflow-field-type");if(!type)return;event.preventDefault();createField(type,FIELD_DEFAULTS[type],dropIndex??fields.length)};

  if(loading)return <main className="page-shell"><div className="card empty-state">Loading builder...</div></main>;
  if(!form)return <main className="page-shell"><div className="notice error">{notice?.text||"Form not found."}</div></main>;

  return <main className="page-shell builder-page-clean">
    <header className="builder-topbar"><div className="builder-topbar-left"><Link className="back-link" to="/forms">Back to Forms</Link><div><h1>{form.title}</h1><span className={`status ${form.status}`}>{form.status}</span></div></div><div className="builder-topbar-actions"><Link className="button secondary" to={`/forms/${formId}/preview`}>Preview</Link><Link className="button secondary" to={`/responses/forms/${formId}`}>Responses</Link><button className="button primary" onClick={publish} disabled={!!busy}>{busy==="publish"?"Publishing...":"Publish"}</button><HeaderMoreMenu onEdit={startDetails} onArchive={archive} onDelete={()=>setConfirmDelete(true)} busy={busy} onOpen={closeFieldMenu}/></div></header>
    {notice&&<div className={`notice ${notice.type}`} role="status">{notice.text}</div>}
    {showDetails&&<form className="card builder-details-drawer" onSubmit={saveDetails}><label>Form title<input value={details.title} onChange={event=>setDetails({...details,title:event.target.value})} required/></label><label>Description<textarea rows="3" value={details.description} onChange={event=>setDetails({...details,description:event.target.value})}/></label><div className="form-actions"><button className="button ghost" type="button" onClick={()=>setShowDetails(false)}>Cancel</button><button className="button primary">Save details</button></div></form>}
    <div className="builder-clean-grid">
      <FieldLibrary onDragStart={dragStart} onAdd={type=>createField(type,FIELD_DEFAULTS[type])}/>
      <section className={`form-canvas card ${dragOver?"drop-active":""}`} onDragOver={event=>{if(Array.from(event.dataTransfer.types).includes("application/x-formflow-field-type")){event.preventDefault();setDragOver(true)}}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setDragOver(false);setDropIndex(null)}}} onDrop={dropField}>
        <div className="canvas-form-heading"><span className="eyebrow">Form Canvas</span><div className="canvas-form-title">{form.title}</div>{form.description&&<p>{form.description}</p>}<button className="button primary mobile-add-field" onClick={()=>setShowAdd(true)}><Plus/> Add Field</button></div>
        {(!fields.length||dragOver)&&<div className="canvas-drop-hint" onDragEnter={()=>setDropIndex(0)}><strong>{fields.length?"Drop to add field":"Start building your form"}</strong><span>{fields.length?"Release to insert this field.":"Drag a field from the Field Library or click a field type to add it."}</span></div>}
        {!!fields.length&&<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragCancel={clearDragState} onDragEnd={handleDragEnd}><SortableContext items={fields.map(field=>field.id)} strategy={verticalListSortingStrategy}><div className="canvas-field-list">{fields.map((field,index)=><SortableField id={field.id} key={field.id}>{({attributes,listeners,setActivatorNodeRef})=><article ref={node=>{if(node)fieldRefs.current[field.id]=node}} className={`canvas-field-card ${selectedId===field.id?"selected":""} ${dropIndex===index?"drop-before":""} ${dragIndicatorClass(field)}`} onClick={()=>selectField(field.id)} onDragEnter={event=>{if(Array.from(event.dataTransfer.types).includes("application/x-formflow-field-type"))setDropIndex(index)}}><button ref={setActivatorNodeRef} className="canvas-drag-handle" type="button" {...attributes} {...listeners} onClick={event=>event.stopPropagation()} aria-label={`Reorder ${field.label}`}><GripVertical size={16}/></button><div className="canvas-field-main"><h3>{field.label}</h3><span>{FIELD_LABELS[field.field_type]||field.field_type}</span></div>{field.required&&<span className="required-badge">Required</span>}<FieldCardMenu field={field} open={openFieldMenuId===field.id} onToggle={toggleFieldMenu} onClose={closeFieldMenu} onSelect={()=>selectField(field.id)} onDuplicate={duplicateField} onDelete={deleteField}/><button className="field-more-button" type="button" onClick={event=>{event.stopPropagation();selectField(field.id)}} aria-label="Select field settings">{selectedId===field.id?<ChevronUp/>:<ChevronDown/>}</button></article>}</SortableField>)}</div></SortableContext></DndContext>}
      </section>
      <aside className="builder-right-panel card"><div className="right-panel-tabs"><button className={rightTab==="settings"?"active":""} onClick={()=>setRightTab("settings")}><Settings/> Field Settings</button><button className={rightTab==="share"?"active":""} onClick={()=>setRightTab("share")}><Share2/> Share</button><button className={rightTab==="versions"?"active":""} onClick={()=>setRightTab("versions")}><FileText/> Versions</button></div>{rightTab==="settings"&&<FieldSettings field={selectedField} formId={formId} reload={loadData} onSaved={flash}/>} {rightTab==="share"&&<div className="settings-panel-content"><div className="settings-selected"><span>Public link</span><h2>Share form</h2></div><p>Publish the form, then generate a public link for respondents.</p><button className="button primary full" onClick={generateLink} disabled={!!busy}>{busy==="share"?"Generating...":"Generate share link"}</button>{shareUrl&&<div className="share-box"><input value={shareUrl} readOnly aria-label="Generated share URL"/><button className="button secondary" onClick={copyLink}>Copy</button></div>}</div>} {rightTab==="versions"&&<div className="settings-panel-content version-history-panel"><div className="settings-selected"><span>Published snapshots</span><h2>Version history</h2></div>{versions.length===0?<p className="muted">No versions published yet.</p>:<><div className="version-history-list">{visibleVersions.map(version=><div className="version-row version-row-action compact" key={version.id}><div><strong>Version {version.version_number}</strong><time>{version.created_at?new Date(version.created_at).toLocaleDateString():"Date unavailable"} · {version.response_count||0} {(version.response_count||0)===1?"response":"responses"}</time></div><span className={`status ${version.status}`}>{version.status}</span>{(version.response_count||0)>0?<Link className="version-response-link" to={`/responses/forms/${formId}?version=${version.id}`}>View Responses</Link>:<span className="version-no-responses">No responses</span>}</div>)}</div>{versions.length>5&&<button className="button secondary full version-toggle-button" type="button" onClick={()=>setShowAllVersions(value=>!value)}>{showAllVersions?"Show latest 5":"View all versions"}</button>}</>}</div>}</aside>
    </div>
    <AddFieldSheet open={showAdd} onClose={()=>setShowAdd(false)} onAdd={type=>createField(type,FIELD_DEFAULTS[type])} busy={busy}/>
    <ConfirmModal open={confirmDelete} title="Delete form?" message={`"${form.title}" will be permanently removed from your workspace.`} busy={busy==="delete-form"} confirmLabel="Delete Form" busyLabel="Deleting..." danger onConfirm={deleteForm} onCancel={()=>setConfirmDelete(false)}/>
  </main>;
}






