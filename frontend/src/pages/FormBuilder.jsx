import { useTranslation } from "react-i18next";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Link,useNavigate,useParams} from "react-router-dom";
import API from "../services/api";
import {DndContext,KeyboardSensor,PointerSensor,closestCenter,useSensor,useSensors} from "@dnd-kit/core";
import {SortableContext,arrayMove,sortableKeyboardCoordinates,useSortable,verticalListSortingStrategy} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import {AtSign,CalendarDays,CheckSquare,ChevronDown,ChevronLeft,ChevronUp,FileText,GitBranch,GripVertical,Hash,ListChecks,ListTree,Mail,MoreHorizontal,PanelTop,Plus,Settings,Share2,Star,Trash2,Type} from "lucide-react";
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
const messageFrom=(error,fallback)=>{
  if(error.response)return error.response.data?.error?.message||error.response.data?.detail||error.response.data?.message||fallback;
  if(error.request)return "Unable to connect to the backend.";
  return fallback;
};

function SortableField({id,children}) {
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id});
  const style={transform:CSS.Transform.toString(transform),transition,opacity:isDragging?.65:1,zIndex:isDragging?10:"auto"};
  return <div ref={setNodeRef} className={`canvas-sortable ${isDragging?"is-dragging":""}`} style={style}>
    {children({attributes,listeners,setActivatorNodeRef,isDragging})}
  </div>;
}

function FieldLibrary({onDragStart,onAdd}) {
  const { t } = useTranslation();
  const [query,setQuery]=useState("");
  const fields=FIELD_DEFS.filter(item=>`${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className="builder-library card" aria-label="Field Library">
    <div className="builder-panel-title"><h2>{t('ui.field_library', `Field Library`)}</h2><p>{t('ui.drag_into_the_canvas_or_click_to_add', `Drag into the canvas or click to add.`)}</p></div>
    <input className="input builder-library-search" style={{ marginBottom: '16px' }} value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('ui.search_fields', `Search fields...`)} aria-label="Search field types"/>
    <div className="builder-library-list">{fields.map(({type,name,description,Icon})=><button className="library-field" key={type} type="button" draggable onDragStart={event=>onDragStart(event,type)} onClick={()=>onAdd(type)}><span><Icon/></span><strong>{name}</strong><small>{description}</small></button>)}</div>
  </aside>;
}

function AddFieldSheet({open,onClose,onAdd,busy}) {
  const { t } = useTranslation();
  const [type,setType]=useState("text");
  if(!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <form className="card add-field-modal" role="dialog" aria-modal="true" aria-labelledby="add-field-title" onSubmit={async event=>{event.preventDefault();if(await onAdd(type))onClose()}}>
      <div className="section-heading"><div><h2 id="add-field-title">{t('ui.add_field', `Add Field`)}</h2><p>{t('ui.choose_a_field_type_to_add_to_your_form', `Choose a field type to add to your form.`)}</p></div></div>
      <label>{t('ui.field_type', `Field type`)}<select value={type} onChange={event=>setType(event.target.value)}>{FIELD_DEFS.map(item=><option value={item.type} key={item.type}>{item.name}</option>)}</select></label>
      <div className="form-actions"><button className="button ghost" type="button" onClick={onClose}>{t('ui.cancel', `Cancel`)}</button><button className="button primary" disabled={!!busy}>{busy==="add"?"Adding...":"Add Field"}</button></div>
    </form>
  </div>;
}

function RuleControl({field,ruleType,label,type="text",placeholder,reload,onSaved,withErrorMessage=false,helper}) {
  const { t } = useTranslation();
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
  return <div className="field-group"><label className="field-label">{label}</label><div className="flex gap-2"><input className="input" type={type} value={value} onChange={event=>setValue(event.target.value)} placeholder={placeholder}/><button className="btn btn-secondary" type="button" onClick={save}>{t('ui.save', `Save`)}</button></div>{withErrorMessage&&<div className="mt-4"><label className="field-label">{t('ui.custom_error_message', `Custom Error Message`)}</label><input className="input mt-2" value={errorMessage} onChange={event=>setErrorMessage(event.target.value)} placeholder={t('ui.show_this_message_when_the_pattern_does', `Show this message when the pattern does not match`)}/></div>}{helper&&<div className="field-hint mt-2">{helper}</div>}{withErrorMessage&&value&&<div className="field-hint mt-2">{t('ui.validation_preview', `Validation preview:`)}{errorMessage||"Invalid format"}</div>}</div>;
}

function OptionsEditor({field,formId,reload,onSaved}) {
  const { t } = useTranslation();
  const [option,setOption]=useState("");
  const addOption=async event=>{
    event.preventDefault();
    if(!option.trim()) return;
    try {await API.post(`/forms/${formId}/fields/${field.id}/options`,{option_label:option.trim(),option_value:option.trim().toLowerCase().replace(/\s+/g,"_"),display_order:field.options.length});setOption("");onSaved?.("Option added.");reload()}
    catch(error){onSaved?.(messageFrom(error,"Unable to add option."),"error")}
  };
  const deleteOption=async id=>{try{await API.delete(`/forms/${formId}/fields/${field.id}/options/${id}`);onSaved?.("Option deleted.");reload()}catch(error){onSaved?.(messageFrom(error,"Unable to delete option."),"error")}};
  const editOption=async item=>{const label=prompt("Option label",item.option_label);if(!label?.trim())return;try{await API.patch(`/forms/${formId}/fields/${field.id}/options/${item.id}`,{option_label:label.trim(),option_value:label.trim().toLowerCase().replace(/\s+/g,"_")});onSaved?.("Option updated.");reload()}catch(error){onSaved?.(messageFrom(error,"Unable to update option."),"error")}};
  return <div className="settings-block"><h3>{t('ui.options', `Options`)}</h3><div className="chips">{field.options?.map(item=><span className="chip" key={item.id}>{item.option_label}<button onClick={()=>editOption(item)} aria-label={`Edit ${item.option_label}`}>{t('ui.edit', `Edit`)}</button><button onClick={()=>deleteOption(item.id)} aria-label={`Delete ${item.option_label}`}>{t('ui.delete', `Delete`)}</button></span>)}</div><form className="mini-form" onSubmit={addOption}><input value={option} onChange={event=>setOption(event.target.value)} placeholder={t('ui.new_option', `New option`)} required/><button className="button secondary">{t('ui.add_option', `Add option`)}</button></form></div>;
}

function FileSettings({field,reload,onSaved}) {
  const { t } = useTranslation();
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
  return <div className="settings-block file-settings"><h3 className="text-h3 mb-4">{t('ui.file_upload_options', `File Upload Options`)}</h3><div className="flex-col gap-3 mb-4">{FILE_TYPES.map(type=><label key={type} className="flex items-center gap-2" style={{ cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: 'var(--brand-600)', width: '16px', height: '16px', cursor: 'pointer' }} checked={selected.includes(type)} onChange={()=>toggle(type)}/><span className="text-body">{type.toUpperCase()}</span></label>)}</div><form className="flex-col gap-2" onSubmit={event=>{event.preventDefault();saveRule("file_size",maxSize)}}><label className="field-label">{t('ui.maximum_size_mb', `Maximum size (MB)`)}</label><div className="flex gap-2"><input className="input" type="number" min="1" max="100" value={maxSize} onChange={event=>setMaxSize(event.target.value)} required/><button className="btn btn-secondary">{t('ui.save_size', `Save size`)}</button></div></form></div>;
}

const VALIDATION_PRESETS={
  none:{label:"None"},
   text:{
    label:"Text Only",
    rule:"regex",
    value:"^[A-Za-z ]+$",
    message:"Only alphabets are allowed"
  },
  email:{label:"Email",rule:"email",value:"true"},
  phone:{label:"Phone Number",rule:"regex",value:"^[6-9]\\d{9}$",message:"Enter a valid 10-digit phone number"},
  url:{label:"URL",rule:"regex",value:"https?://.+",message:"Enter a valid URL"},
  number:{label:"Number",rule:"regex",value:"^-?\\d+(\\.\\d+)?$",message:"Enter a valid number"},
  custom:{label:"Custom Regex"},
};
function ValidationTypeControl({field,reload,onSaved}) {
  const { t } = useTranslation();
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
    <label>{t('ui.validation_type', `Validation Type`)}<select value={type} onChange={event=>setType(event.target.value)}>
        {Object.entries(VALIDATION_PRESETS).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}
      </select>
    </label>
    {type==="custom"&&<>
      <label>{t('ui.regex_pattern', `Regex Pattern`)}<input value={pattern} onChange={event=>setPattern(event.target.value)} placeholder={t('ui._6_9_d_9', `^[6-9]\\d{9}$`)}/></label>
      <label>{t('ui.custom_error_message', `Custom Error Message`)}<input value={message} onChange={event=>setMessage(event.target.value)} placeholder={t('ui.enter_a_valid_value', `Enter a valid value`)}/></label>
      <small className="rule-helper">{t('ui.examples_phone_6_9_d_9_email_s_s_s_pan_a', `Examples: Phone ^[6-9]\d{9}$ · Email ^[^\s@]+@[^\s@]+\.[^\s@]+$ · PAN ^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)}</small>
    </>}
    <button className="button primary validation-save-button" type="button" onClick={save}>{t('ui.save_validation', `Save Validation`)}</button>
  </div>;
}

function ToggleRuleControl({field,ruleType,label,reload,onSaved}) {
  const { t } = useTranslation();
  const existing=(field.validation_rules||[]).find(rule=>rule.rule_type===ruleType);
  const checked=!!existing&&String(existing.rule_value||"true").toLowerCase()!=="false";
  const toggle=async()=>{
    try{
      if(existing) await API.delete(`/forms/fields/${field.id}/validation-rules/${existing.id}`);
      else await API.post(`/forms/fields/${field.id}/validation-rules`,{rule_type:ruleType,rule_value:"true"});
      onSaved?.("Validation saved.");
      reload();
    }catch(error){onSaved?.(messageFrom(error,"Unable to save validation."),"error")}
  };
  return <label className="check-label"><input type="checkbox" checked={checked} onChange={toggle}/> {label}</label>;
}

function FieldValidationRules({field,reload,onSaved}) {
  const { t } = useTranslation();
  const textLike=["text","textarea","email"].includes(field.field_type);
  const numeric=field.field_type==="number";
  const dated=field.field_type==="date";
  return <div className="settings-block field-validation-rules">
    <h3>{t('ui.field_rules', `Field Rules`)}</h3>
    {textLike&&<>
      <RuleControl field={field} ruleType="min_length" label={t('ui.minimum_length', `Minimum length`)} type="number" placeholder="2" reload={reload} onSaved={onSaved}/>
      <RuleControl field={field} ruleType="max_length" label={t('ui.maximum_length', `Maximum length`)} type="number" placeholder="120" reload={reload} onSaved={onSaved}/>
    </>}
    {numeric&&<>
      <div className="inline-checks">
        <ToggleRuleControl field={field} ruleType="integer" label={t('ui.require_whole_number', `Require whole number`)} reload={reload} onSaved={onSaved}/>
        <ToggleRuleControl field={field} ruleType="decimal" label={t('ui.allow_decimal_format', `Allow decimal format`)} reload={reload} onSaved={onSaved}/>
      </div>
      <RuleControl field={field} ruleType="min_value" label={t('ui.minimum_value', `Minimum value`)} type="number" placeholder="0" reload={reload} onSaved={onSaved}/>
      <RuleControl field={field} ruleType="max_value" label={t('ui.maximum_value', `Maximum value`)} type="number" placeholder="100" reload={reload} onSaved={onSaved}/>
    </>}
    {dated&&<>
      <RuleControl field={field} ruleType="min_date" label={t('ui.earliest_date', `Earliest date`)} type="date" reload={reload} onSaved={onSaved}/>
      <RuleControl field={field} ruleType="max_date" label={t('ui.latest_date', `Latest date`)} type="date" reload={reload} onSaved={onSaved}/>
    </>}
    {!textLike&&!numeric&&!dated&&field.field_type!=="file"&&field.field_type!=="rating"&&<p className="muted">{t('ui.no_extra_field_level_validation_is_neede', `No extra field-level validation is needed for this field type.`)}</p>}
  </div>;
}

function FieldSettings({field,formId,reload,onSaved}) {
  const { t } = useTranslation();
  const [tab,setTab]=useState("general");
  const [draft,setDraft]=useState({label:field?.label||"",required:!!field?.required,placeholder:field?.placeholder||"",help_text:field?.help_text||""});
  const labelRef=useRef(null);
  useEffect(()=>{setTab("general");setDraft({label:field?.label||"",required:!!field?.required,placeholder:field?.placeholder||"",help_text:field?.help_text||""});setTimeout(()=>labelRef.current?.focus(),50)},[field?.id]);
  if(!field) return <div className="settings-empty"><Settings/><h2>{t('ui.select_a_field', `Select a field`)}</h2><p>{t('ui.choose_a_field_in_the_canvas_to_configur', `Choose a field in the canvas to configure its settings.`)}</p></div>;
  const saveGeneral=async event=>{
    event.preventDefault();
    if(!draft.label.trim()) return onSaved("Field label is required.","error");
    try {await API.patch(`/forms/${formId}/fields/${field.id}`,{label:draft.label.trim(),required:draft.required,placeholder:draft.placeholder,help_text:draft.help_text});onSaved("Field saved.");reload()}
    catch(error){onSaved(messageFrom(error,"Unable to save field."),"error")}
  };
  const optionField=OPTION_TYPES.includes(field.field_type);
  return <div className="settings-panel-content">
    <div className="settings-selected"><span>{FIELD_LABELS[field.field_type]}</span><h2>{field.label}</h2></div>
    <div className="settings-tabs compact"><button className={tab==="general"?"active":""} onClick={()=>setTab("general")}>{t('ui.general', `General`)}</button><button className={tab==="validation"?"active":""} onClick={()=>setTab("validation")}>{t('ui.validation', `Validation`)}</button>{optionField&&<button className={tab==="options"?"active":""} onClick={()=>setTab("options")}>{t('ui.options', `Options`)}</button>}</div>
    {tab==="general"&&<form className="settings-form" onSubmit={saveGeneral}><label>{t('ui.label', `Label`)}<input ref={labelRef} value={draft.label} onChange={event=>setDraft({...draft,label:event.target.value})} required/></label>{["text","email","number","textarea","dropdown"].includes(field.field_type)&&<label>{t('ui.placeholder', `Placeholder`)}<input value={draft.placeholder} onChange={event=>setDraft({...draft,placeholder:event.target.value})}/></label>}<label>{t('ui.help_text', `Help Text`)}<textarea rows="3" value={draft.help_text} onChange={event=>setDraft({...draft,help_text:event.target.value})}/></label><label className="check-label"><input type="checkbox" checked={draft.required} onChange={event=>setDraft({...draft,required:event.target.checked})}/>{t('ui.required', `Required`)}</label><button className="button primary">{t('ui.save_settings', `Save settings`)}</button></form>}
    {tab==="validation"&&<div className="settings-form"><ValidationTypeControl field={field} reload={reload} onSaved={onSaved}/><FieldValidationRules field={field} reload={reload} onSaved={onSaved}/>{field.field_type==="file"&&<FileSettings field={field} reload={reload} onSaved={onSaved}/>} {field.field_type==="rating"&&<div className="settings-block rating-settings"><h3>{t('ui.rating_settings', `Rating Settings`)}</h3><RuleControl field={field} ruleType="min_value" label={t('ui.scale_minimum', `Scale minimum`)} type="number" placeholder="1" reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="max_value" label={t('ui.scale_maximum', `Scale maximum`)} type="number" placeholder="5" reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="rating_style" label={t('ui.display_style', `Display style`)} placeholder={t('ui.stars_or_numbers', `stars or numbers`)} reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="low_label" label={t('ui.low_label', `Low label`)} placeholder={t('ui.very_dissatisfied', `Very dissatisfied`)} reload={reload} onSaved={onSaved}/><RuleControl field={field} ruleType="high_label" label={t('ui.high_label', `High label`)} placeholder={t('ui.very_satisfied', `Very satisfied`)} reload={reload} onSaved={onSaved}/></div>}</div>}
    {tab==="options"&&optionField&&<OptionsEditor field={field} formId={formId} reload={reload} onSaved={onSaved}/>}
  </div>;
}

const LOGIC_EMPTY_OPERATORS=["is_empty","is_not_empty"];
const LOGIC_OPERATORS_BY_TYPE={
  text:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  email:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  textarea:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  number:["equals","not_equals","greater_than","less_than","in","not_in","is_empty","is_not_empty"],
  date:["equals","not_equals","greater_than","less_than","in","not_in","is_empty","is_not_empty"],
  rating:["equals","not_equals","greater_than","less_than","in","not_in","is_empty","is_not_empty"],
  checkbox:["equals","not_equals","in","not_in","is_empty","is_not_empty"],
  dropdown:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  radio:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  multi_select:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  checkbox_group:["equals","not_equals","contains","in","not_in","is_empty","is_not_empty"],
  file:["is_empty","is_not_empty"],
};
const LOGIC_OPERATOR_LABELS={equals:"Equals",not_equals:"Does Not Equal",contains:"Contains",greater_than:"Greater Than",less_than:"Less Than",in:"Is In List",not_in:"Is Not In List",is_empty:"Is Empty",is_not_empty:"Is Not Empty"};
const LOGIC_ACTION_LABELS={show:"Show",hide:"Hide",require:"Require",optional:"Make optional"};
const logicOperatorOptions=field=>LOGIC_OPERATORS_BY_TYPE[field?.field_type]||LOGIC_EMPTY_OPERATORS;
const logicLoadMessage=error=>{
  if(error.response?.status===401)return "Your session has expired. Please sign in again.";
  if(error.response?.status===403)return "You do not have permission to manage these rules.";
  if(error.response?.data?.detail)return error.response.data.detail;
  if(error.response?.data?.message)return error.response.data.message;
  if(error.response?.data?.error?.message)return error.response.data.error.message;
  if(error.request)return "Unable to load conditional rules. Check that the backend is running.";
  return "Unable to load conditional rules.";
};

function LogicPanel({formId,fields,onSaved,onRulesChange}) {
  const { t } = useTranslation();
  const firstTrigger=fields[0]?.id||"";
  const firstTarget=fields.find(field=>field.id!==firstTrigger)?.id||"";
  const blankDraft={trigger_field_id:firstTrigger,operator:logicOperatorOptions(fields[0])[0]||"equals",comparison_value:"",action:"show",target_field_id:firstTarget};
  const [rules,setRules]=useState([]);
  const [draft,setDraft]=useState(blankDraft);
  const [editingId,setEditingId]=useState(null);
  const [loading,setLoading]=useState(false);
  const [loadError,setLoadError]=useState("");
  const [saving,setSaving]=useState(false);
  const fieldById=useMemo(()=>Object.fromEntries(fields.map(field=>[String(field.id),field])),[fields]);
  const validRules=useMemo(()=>rules.filter(rule=>fieldById[String(rule.trigger_field_id)]&&fieldById[String(rule.target_field_id)]),[rules,fieldById]);
  const triggerField=fieldById[String(draft.trigger_field_id)];
  const operators=logicOperatorOptions(triggerField);
  const hideComparison=LOGIC_EMPTY_OPERATORS.includes(draft.operator);
  const targets=fields.filter(field=>String(field.id)!==String(draft.trigger_field_id));
  const resetDraft=()=>{const trigger=fields[0];const target=fields.find(field=>field.id!==trigger?.id);setDraft({trigger_field_id:trigger?.id||"",operator:logicOperatorOptions(trigger)[0]||"equals",comparison_value:"",action:"show",target_field_id:target?.id||""});setEditingId(null)};
  const loadRules=useCallback(async()=>{
    if(!formId)return;
    setLoading(true);
    setLoadError("");
    try{
      const response=await API.get(`/forms/${formId}/rules`);
      const nextRules=response.data||[];
      setRules(nextRules);
      onRulesChange?.(nextRules);
    }catch(error){
      setLoadError(logicLoadMessage(error));
    }finally{
      setLoading(false);
    }
  },[formId]);
  useEffect(()=>{loadRules()},[loadRules]);
  useEffect(()=>{if(validRules.length!==rules.length)onRulesChange?.(validRules)},[validRules,rules.length,onRulesChange]);
  useEffect(()=>{if(fields.length>=2&&!fieldById[String(draft.trigger_field_id)])resetDraft()},[fields.length]);
  useEffect(()=>{
    if(!operators.includes(draft.operator))setDraft(current=>({...current,operator:operators[0]||"is_empty",comparison_value:""}));
    if(targets.length&&!targets.find(field=>String(field.id)===String(draft.target_field_id)))setDraft(current=>({...current,target_field_id:targets[0].id}));
    if(!targets.length&&draft.target_field_id)setDraft(current=>({...current,target_field_id:""}));
  },[draft.trigger_field_id,draft.operator,draft.target_field_id,operators.join("|"),targets.map(field=>field.id).join("|")]);
  const saveRule=async event=>{
    event.preventDefault();
    if(fields.length<2)return onSaved("Add at least two fields before creating logic rules.","error");
    if(!draft.trigger_field_id||!draft.target_field_id)return onSaved("Choose both trigger and target fields.","error");
    const payload={...draft,comparison_value:hideComparison?null:String(draft.comparison_value||"").trim(),trigger_field_id:Number(draft.trigger_field_id),target_field_id:Number(draft.target_field_id)};
    if(!hideComparison&&!payload.comparison_value)return onSaved("Comparison value is required.","error");
    setSaving(true);
    try{
      if(editingId)await API.patch(`/forms/${formId}/rules/${editingId}`,payload);
      else await API.post(`/forms/${formId}/rules`,payload);
      onSaved(editingId?"Logic rule updated.":"Logic rule created.");
      resetDraft();
      await loadRules();
    }catch(error){onSaved(messageFrom(error,"Unable to save logic rule."),"error")}
    finally{setSaving(false)}
  };
  const editRule=rule=>{setEditingId(rule.id);setDraft({trigger_field_id:rule.trigger_field_id,operator:rule.operator,comparison_value:rule.comparison_value||"",action:rule.action,target_field_id:rule.target_field_id})};
  const deleteRule=async rule=>{
    if(!window.confirm("Delete this logic rule?"))return;
    try{await API.delete(`/forms/${formId}/rules/${rule.id}`);onSaved("Logic rule deleted.");if(editingId===rule.id)resetDraft();await loadRules()}
    catch(error){onSaved(messageFrom(error,"Unable to delete logic rule."),"error")}
  };
  const describeRule=rule=>{
    const trigger=fieldById[String(rule.trigger_field_id)]?.label||"Unknown field";
    const target=fieldById[String(rule.target_field_id)]?.label||"Unknown field";
    const comparison=LOGIC_EMPTY_OPERATORS.includes(rule.operator)?"":` ${rule.comparison_value}`;
    return <><strong>{trigger} {LOGIC_OPERATOR_LABELS[rule.operator]}{comparison}</strong><span>→ {LOGIC_ACTION_LABELS[rule.action]||rule.action} {target}</span></>;
  };
  return <div className="settings-panel-content logic-panel">
    <div className="settings-selected"><span>{t('ui.conditional_logic', `Conditional logic`)}</span><h2>{t('ui.rule_builder', `Rule Builder`)}</h2></div>
    <form className="logic-rule-form" onSubmit={saveRule}>
      <label>{t('ui.trigger_field', `Trigger field`)}<select value={draft.trigger_field_id} onChange={event=>setDraft({...draft,trigger_field_id:event.target.value,operator:logicOperatorOptions(fieldById[event.target.value])[0]||"is_empty",comparison_value:""})}>{fields.map(field=><option value={field.id} key={field.id}>{field.label}</option>)}</select></label>
      <label>{t('ui.operator', `Operator`)}<select value={draft.operator} onChange={event=>setDraft({...draft,operator:event.target.value,comparison_value:LOGIC_EMPTY_OPERATORS.includes(event.target.value)?"":draft.comparison_value})}>{operators.map(operator=><option value={operator} key={operator}>{LOGIC_OPERATOR_LABELS[operator]}</option>)}</select></label>
      {!hideComparison&&<label>{t('ui.comparison_value', `Comparison value`)}<input value={draft.comparison_value} onChange={event=>setDraft({...draft,comparison_value:event.target.value})} placeholder={["in","not_in"].includes(draft.operator)?"CSE,AI&DS,IT":"Yes"}/>{["in","not_in"].includes(draft.operator)&&<small>{t('ui.enter_comma_separated_values_for_example', `Enter comma-separated values, for example: CSE,AI&DS,IT`)}</small>}</label>}
      <label>{t('ui.action', `Action`)}<select value={draft.action} onChange={event=>setDraft({...draft,action:event.target.value})}>{Object.entries(LOGIC_ACTION_LABELS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label>{t('ui.target_field', `Target field`)}<select value={draft.target_field_id} onChange={event=>setDraft({...draft,target_field_id:event.target.value})}>{targets.map(field=><option value={field.id} key={field.id}>{field.label}</option>)}</select></label>
      <div className="form-actions"><button className="button primary" disabled={saving||fields.length<2}>{saving?"Saving...":editingId?"Update Rule":"Create Rule"}</button>{editingId&&<button className="button ghost" type="button" onClick={resetDraft}>{t('ui.cancel_edit', `Cancel edit`)}</button>}</div>
    </form>
    <div className="logic-rule-list">
      <h3>{t('ui.existing_rules', `Existing rules`)}</h3>
      {loadError?<div className="logic-error-state" role="alert"><p>{loadError}</p><button type="button" className="button secondary" onClick={loadRules} disabled={loading}>{loading?"Retrying...":"Retry"}</button></div>:loading?<p className="muted">{t('ui.loading_rules', `Loading rules...`)}</p>:validRules.length?validRules.map(rule=><article className="logic-rule-item" key={rule.id}><div>{describeRule(rule)}</div><div><button type="button" onClick={()=>editRule(rule)}>{t('ui.edit', `Edit`)}</button><button type="button" className="danger" onClick={()=>deleteRule(rule)}>{t('ui.delete', `Delete`)}</button></div></article>):<p className="muted">{t('ui.no_conditional_rules_yet_create_a_rule_t', `No conditional rules yet. Create a rule to manage field visibility or requirements later.`)}</p>}
    </div>
  </div>;
}

function HeaderMoreMenu({onEdit,onArchive,onDelete,busy,onOpen}) {
  const { t } = useTranslation();
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
  const menu=open&&createPortal(<div ref={menuRef} className="builder-action-popover" style={{top:position.top,left:position.left}} role="menu" aria-label="Form actions"><button role="menuitem" onClick={()=>{setOpen(false);onEdit()}}>{t('ui.edit_details', `Edit Details`)}</button><button role="menuitem" onClick={()=>{setOpen(false);onArchive()}} disabled={!!busy}>{t('ui.archive_form', `Archive Form`)}</button><span className="popover-separator"/><button role="menuitem" className="danger" onClick={()=>{setOpen(false);onDelete()}}>{t('ui.delete_form', `Delete Form`)}</button></div>,document.body);
  const toggle=event=>{event.stopPropagation();setOpen(current=>{const next=!current;if(next)onOpen?.();return next})};
  return <div className="action-menu-wrap"><button ref={buttonRef} className="more-button" type="button" onClick={toggle} aria-label="More form actions" aria-haspopup="menu" aria-expanded={open}><MoreHorizontal/></button>{menu}</div>;
}

function FieldCardMenu({field,open,onToggle,onClose,onSelect,onDuplicate,onDelete}) {
  const { t } = useTranslation();
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
  const menu=open&&createPortal(<div ref={menuRef} className="builder-action-popover field-action-popover" style={{top:position.top,left:position.left}} role="menu" aria-label={`Actions for ${field.label}`} onClick={event=>event.stopPropagation()}><button role="menuitem" onClick={()=>run(()=>onSelect(field))}>{t('ui.edit', `Edit`)}</button><button role="menuitem" onClick={()=>run(()=>onDuplicate(field))}>{t('ui.duplicate', `Duplicate`)}</button><span className="popover-separator"/><button role="menuitem" className="danger" onClick={()=>run(()=>onDelete(field))}>{t('ui.delete', `Delete`)}</button></div>,document.body);
  return <div className="action-menu-wrap"><button ref={buttonRef} className="field-more-button" type="button" onClick={event=>{event.stopPropagation();onToggle(field.id)}} aria-label={`More actions for ${field.label}`} aria-haspopup="menu" aria-expanded={open}><MoreHorizontal/></button>{menu}</div>;
}

function VersionHistoryPanel({ versions }) {
  const { t } = useTranslation();
  return (
    <div className="settings-panel-content logic-panel">
      <div className="settings-selected">
        <span>{t('ui.publish_history', `Publish history`)}</span>
        <h2>{t('ui.version_timeline', `Version Timeline`)}</h2>
      </div>
      <div className="logic-rule-list" style={{ marginTop: 24 }}>
        {!versions?.length ? (
          <div className="empty-state" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <GitBranch size={32} color="var(--border-strong)" style={{ marginBottom: 12, opacity: 0.5 }} />
            <strong style={{ display: 'block', fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>{t('ui.no_versions_yet', `No versions yet`)}</strong>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.publish_your_form_to_create_the_first_ve', `Publish your form to create the first version.`)}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {versions.map((v, i) => (
              <div key={v.id || i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? 'var(--brand-100)' : 'var(--bg-page)', color: i === 0 ? 'var(--brand-600)' : 'var(--text-tertiary)', border: `1px solid ${i === 0 ? 'var(--brand-200)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0 }}>
                    <GitBranch size={14} />
                  </div>
                  {i < versions.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border-subtle)', margin: '4px 0', minHeight: 24 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: i < versions.length - 1 ? 24 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>{t('ui.version', `Version`)}{v.version_number}
                        {i === 0 && <span className="badge" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-200)', fontSize: 11, padding: '2px 6px' }}>{t('ui.latest', `Latest`)}</span>}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {new Date(v.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const { t } = useTranslation();
  const {formId}=useParams();
  const navigate=useNavigate();
  const [form,setForm]=useState(null);
  const [versions,setVersions]=useState([]);
  const [logicRules,setLogicRules]=useState([]);
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
    try{const [formResponse,versionResponse,rulesResponse]=await Promise.all([API.get(`/forms/${formId}`),API.get(`/forms/${formId}/versions`),API.get(`/forms/${formId}/rules`)]);setForm(formResponse.data);setVersions(Array.isArray(versionResponse.data)?versionResponse.data:[]);setLogicRules(Array.isArray(rulesResponse.data)?rulesResponse.data:[])}
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
  const ruleRole=field=>({trigger:logicRules.some(rule=>String(rule.trigger_field_id)===String(field.id)),target:logicRules.some(rule=>String(rule.target_field_id)===String(field.id))});
  const validationBadge=field=>{
  const rules=field.validation_rules||[];

  if(!rules.length) return null;

  if(rules.some(rule=>rule.rule_type==="email"))
    return "Email Validation";

  if(rules.some(rule=>rule.rule_type==="regex"))
    return "Pattern Validation";

  if(rules.some(rule=>rule.rule_type==="min_length"))
    return "Length Rule";

  if(rules.some(rule=>rule.rule_type==="max_length"))
    return "Length Rule";

  if(rules.some(rule=>rule.rule_type==="min_value"||rule.rule_type==="max_value"))
    return "Range Rule";

  return "Validated";
};
  const deleteField=async field=>{
    closeFieldMenu();
    let ruleCount=0;
    try{
      const {data}=await API.get(`/forms/${formId}/rules`);
      ruleCount=(data||[]).filter(rule=>String(rule.trigger_field_id)===String(field.id)||String(rule.target_field_id)===String(field.id)).length;
    }catch{
      ruleCount=0;
    }
    const message=ruleCount
      ?`This field is used in ${ruleCount} conditional ${ruleCount===1?"rule":"rules"}.\nDeleting it will also remove ${ruleCount===1?"that rule":"those rules"}.\n\nDelete "${field.label}" and related rules?`
      :`Delete "${field.label}"? This cannot be undone.`;
    if(!window.confirm(message))return;
    try{
      const {data}=await API.delete(`/forms/${formId}/fields/${field.id}`);
      if(selectedId===field.id)setSelectedId(null);
      setLogicRules(current=>current.filter(rule=>String(rule.trigger_field_id)!==String(field.id)&&String(rule.target_field_id)!==String(field.id)));
      const deletedRules=Number(data?.deleted_rule_count||0);
      flash(deletedRules?`Field deleted. ${deletedRules} related ${deletedRules===1?"rule was":"rules were"} removed.`:"Field deleted.");
      await loadData();
    }catch(error){toast.error(messageFrom(error,"Unable to delete field. Please try again."))}
  };
  const publish=async()=>{setBusy("publish");try{const {data}=await API.post(`/forms/${formId}/publish`);if(data?.unchanged){toast.success(`No changes to publish. Version ${data.version_number} is already up to date.`);return}flash(`Form published successfully - version ${data.version_number}.`);await loadData()}catch(error){toast.error(messageFrom(error,"Unable to publish the form. Please try again."))}finally{setBusy("")}};
  const archive=async()=>{setBusy("archive");try{await API.post(`/forms/${formId}/archive`);flash("Form archived.");await loadData()}catch(error){toast.error(messageFrom(error,"Unable to archive the form. Please try again."))}finally{setBusy("")}};
  const deleteForm=async()=>{setBusy("delete-form");try{await API.delete(`/forms/${formId}`);toast.success("Form deleted.");navigate("/workspace/forms",{replace:true})}catch(error){toast.error(messageFrom(error,"Unable to delete form."))}finally{setBusy("");setConfirmDelete(false)}};
  const generateLink=async()=>{setBusy("share");try{const {data}=await API.post(`/forms/${formId}/generate-link`);setShareUrl(`${window.location.origin}/f/${data.link_token}`);flash("Share link generated.")}catch(error){toast.error(messageFrom(error,"Unable to generate share link. Publish the form first."))}finally{setBusy("")}};
  const copyLink=async()=>{try{await navigator.clipboard.writeText(shareUrl);flash("Link copied to clipboard.")}catch{toast.error("Copy failed. Select the link and copy it manually.")}};
  const saveDetails=async event=>{event.preventDefault();if(!details.title.trim())return toast.error("Form title is required.");try{await API.patch(`/forms/${formId}`,{title:details.title.trim(),description:details.description});flash("Form details updated.");setShowDetails(false);await loadData()}catch(error){toast.error(messageFrom(error,"Unable to update form details."))}};
  const startDetails=()=>{setDetails({title:form.title,description:form.description||""});setShowDetails(true)};
  const dragStart=(event,type)=>{closeFieldMenu();event.dataTransfer.effectAllowed="copy";event.dataTransfer.setData("application/x-formflow-field-type",type)};
  const dropField=event=>{const type=event.dataTransfer.getData("application/x-formflow-field-type");if(!type)return;event.preventDefault();createField(type,FIELD_DEFAULTS[type],dropIndex??fields.length)};

  if(loading)return <div className="page-shell"><div className="card empty-state">{t('ui.loading_builder', `Loading builder...`)}</div></div>;
  if(!form)return <div className="page-shell"><div className="notice error">{notice?.text||"Form not found."}</div></div>;

  return <div className="builder-grid" style={{ margin: 'calc(var(--space-6) * -1)', width: 'calc(100% + var(--space-6) * 2)' }}>
    <div className="builder-col">
      <FieldLibrary onDragStart={dragStart} onAdd={type=>createField(type,FIELD_DEFAULTS[type])}/>
    </div>
    
    <div className="builder-canvas">
      {notice&&<div className={`notice ${notice.type}`} style={{width: '100%', maxWidth: '680px', marginBottom: '16px'}} role="status">{notice.text}</div>}
      
      <div className="flex justify-between items-center w-full mb-4" style={{ maxWidth: '680px' }}>
        <div className="flex items-center gap-3">
          <Link className="btn btn-ghost btn-icon" to="/workspace/forms"><ChevronLeft size={18}/></Link>
          <div className="flex-col">
            <h1 className="text-h2" style={{ margin: 0 }}>{form.title}</h1>
            <span className={`badge ${form.status}`}>{form.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={startDetails}>{t('ui.details', `Details`)}</button>
          <Link className="btn btn-secondary" to={`/workspace/forms/${formId}/preview`}>{t('ui.preview', `Preview`)}</Link>
          <button className="btn btn-primary" onClick={publish} disabled={!!busy}>{busy==="publish"?"Publishing...":"Publish"}</button>
          <HeaderMoreMenu onEdit={startDetails} onArchive={archive} onDelete={()=>setConfirmDelete(true)} busy={busy} onOpen={closeFieldMenu}/>
        </div>
      </div>

      <section className={`builder-form-sheet ${dragOver?"drop-active":""}`} onDragOver={event=>{if(Array.from(event.dataTransfer.types).includes("application/x-formflow-field-type")){event.preventDefault();setDragOver(true)}}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setDragOver(false);setDropIndex(null)}}} onDrop={dropField}>
        {(!fields.length||dragOver)&&<div className="empty-state" onDragEnter={()=>setDropIndex(0)}><strong>{fields.length?"Drop to add field":"Start building your form"}</strong><p>{fields.length?"Release to insert this field.":"Drag a field from the Field Library or click a field type to add it."}</p></div>}
        {!!fields.length&&<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragCancel={clearDragState} onDragEnd={handleDragEnd}><SortableContext items={fields.map(field=>field.id)} strategy={verticalListSortingStrategy}><div className="flex-col gap-3">{fields.map((field,index)=><SortableField id={field.id} key={field.id}>{({attributes,listeners,setActivatorNodeRef})=>{const roles=ruleRole(field);return <article ref={node=>{if(node)fieldRefs.current[field.id]=node}} className={`panel ${selectedId===field.id?"selected":""} ${dropIndex===index?"drop-before":""} ${dragIndicatorClass(field)}`} onClick={()=>selectField(field.id)} onDragEnter={event=>{if(Array.from(event.dataTransfer.types).includes("application/x-formflow-field-type"))setDropIndex(index)}}><div className="panel-body flex gap-3 items-center" style={{ padding: '12px' }}><button ref={setActivatorNodeRef} className="btn-icon btn-ghost" type="button" {...attributes} {...listeners} onClick={event=>event.stopPropagation()} aria-label={`Reorder ${field.label}`}><GripVertical size={16}/></button><div className="flex-col" style={{ flex: 1 }}><h3 className="text-h3" style={{ margin: 0 }}>{field.label}</h3><span className="text-small">{FIELD_LABELS[field.field_type]||field.field_type}</span></div>{field.required&&<span className="badge">{t('ui.required', `Required`)}</span>}{(roles.trigger||roles.target)&&<button type="button" className="badge" style={{ cursor: 'pointer' }} onClick={event=>{event.stopPropagation();setSelectedId(field.id);setRightTab("logic")}}>{roles.trigger&&roles.target?"Logic":roles.trigger?"Trigger":"Target"}</button>}<FieldCardMenu field={field} open={openFieldMenuId===field.id} onToggle={toggleFieldMenu} onClose={closeFieldMenu} onSelect={()=>selectField(field.id)} onDuplicate={duplicateField} onDelete={deleteField}/><button className="btn-icon btn-ghost" type="button" onClick={event=>{event.stopPropagation();selectField(field.id)}} aria-label="Select field settings">{selectedId===field.id?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button></div></article>}}</SortableField>)}</div></SortableContext></DndContext>}
      </section>
    </div>

    <div className="builder-col">
      <div className="flex items-center" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)', flexWrap: 'wrap' }}>
        <button className={`btn-ghost ${rightTab==="settings"?"active":""}`} style={{ flex: 1, padding: '12px 8px', border: 'none', borderBottom: rightTab==="settings"?'2px solid var(--brand-primary)':'2px solid transparent', fontSize: '13px', fontWeight: 600 }} onClick={()=>setRightTab("settings")}>{t('ui.field', `Field`)}</button>
        <button className={`btn-ghost ${rightTab==="logic"?"active":""}`} style={{ flex: 1, padding: '12px 8px', border: 'none', borderBottom: rightTab==="logic"?'2px solid var(--brand-primary)':'2px solid transparent', fontSize: '13px', fontWeight: 600 }} onClick={()=>setRightTab("logic")}>{t('ui.logic', `Logic`)}</button>
        <button className={`btn-ghost ${rightTab==="share"?"active":""}`} style={{ flex: 1, padding: '12px 8px', border: 'none', borderBottom: rightTab==="share"?'2px solid var(--brand-primary)':'2px solid transparent', fontSize: '13px', fontWeight: 600 }} onClick={()=>setRightTab("share")}>{t('ui.share', `Share`)}</button>
        <button className={`btn-ghost ${rightTab==="history"?"active":""}`} style={{ flex: 1, padding: '12px 8px', border: 'none', borderBottom: rightTab==="history"?'2px solid var(--brand-primary)':'2px solid transparent', fontSize: '13px', fontWeight: 600 }} onClick={()=>setRightTab("history")}>{t('ui.history', `History`)}</button>
      </div>
      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {rightTab==="settings"&&<FieldSettings field={selectedField} formId={formId} reload={loadData} onSaved={flash}/>}
        {rightTab==="logic"&&<LogicPanel formId={formId} fields={fields} onSaved={flash} onRulesChange={setLogicRules}/>}
        {rightTab==="history"&&<VersionHistoryPanel versions={versions} />}
        {rightTab==="share"&&<div className="flex-col gap-4"><div><h3 className="text-h3">{t('ui.share_form', `Share form`)}</h3><p className="text-body">{t('ui.generate_a_public_link_for_respondents', `Generate a public link for respondents.`)}</p></div><button className="btn btn-primary w-full" onClick={generateLink} disabled={!!busy}>{busy==="share"?"Generating...":"Generate Link"}</button>{shareUrl&&<div className="flex-col gap-2"><input className="input" value={shareUrl} readOnly/><button className="btn btn-secondary w-full" onClick={copyLink}>{t('ui.copy_link', `Copy Link`)}</button></div>}</div>}
      </div>
    </div>
    <AddFieldSheet open={showAdd} onClose={()=>setShowAdd(false)} onAdd={type=>createField(type,FIELD_DEFAULTS[type])} busy={busy}/>
    <ConfirmModal open={confirmDelete} title={t('ui.delete_form', `Delete form?`)} message={`"${form.title}" will be permanently removed from your workspace.`} busy={busy==="delete-form"} confirmLabel="Delete Form" busyLabel="Deleting..." danger onConfirm={deleteForm} onCancel={()=>setConfirmDelete(false)}/>
    
    {showDetails && (
      <div className="modal-backdrop" role="presentation" onMouseDown={e => { if(e.target === e.currentTarget) setShowDetails(false); }}>
        <form className="card add-field-modal" role="dialog" aria-modal="true" onSubmit={saveDetails} style={{ width: '100%', maxWidth: 480 }}>
          <div className="section-heading" style={{ marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{t('ui.form_details', `Form Details`)}</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{t('ui.update_the_form_s_title_and_description', `Update the form's title and description.`)}</p>
            </div>
          </div>
          <label style={{ display: 'block', marginBottom: 16, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('ui.form_title', `Form Title`)}<input className="input" style={{ width: '100%', marginTop: 8 }} value={details.title} onChange={e => setDetails({...details, title: e.target.value})} required autoFocus />
          </label>
          <label style={{ display: 'block', marginBottom: 24, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('ui.description', `Description`)}<textarea className="input" rows="3" style={{ width: '100%', marginTop: 8, resize: 'vertical' }} value={details.description} onChange={e => setDetails({...details, description: e.target.value})} placeholder={t('ui.optional_description', `Optional description...`)} />
          </label>
          <div className="form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="button ghost" type="button" onClick={() => setShowDetails(false)}>{t('ui.cancel', `Cancel`)}</button>
            <button className="button primary" type="submit">{t('ui.save_details', `Save Details`)}</button>
          </div>
        </form>
      </div>
    )}
  </div>;
}
