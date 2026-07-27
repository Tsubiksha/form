export const isEmptyValue=(value)=>{
  if(value===undefined||value===null)return true;
  if(typeof value==="string")return value.trim()==="";
  if(Array.isArray(value))return value.length===0;
  if(value instanceof File)return false;
  return false;
};

const text=value=>typeof value==="boolean"?(value?"true":"false"):String(value??"").trim().toLowerCase();
const number=value=>{
  if(value===undefined||value===null||String(value).trim()==="")return null;
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:null;
};
const list=value=>new Set(String(value??"").split(",").map(text).filter(Boolean));

export function conditionMatches(rule,answers){
  const value=answers?.[rule.trigger_field_id]??answers?.[String(rule.trigger_field_id)];
  const operator=rule.operator;
  if(operator==="is_empty")return isEmptyValue(value);
  if(operator==="is_not_empty")return !isEmptyValue(value);
  if(isEmptyValue(value))return false;
  if(operator==="greater_than"||operator==="less_than"){
    const left=number(value);
    const right=number(rule.comparison_value);
    if(left===null||right===null)return false;
    return operator==="greater_than"?left>right:left<right;
  }
  if(operator==="in"||operator==="not_in"){
    const allowed=list(rule.comparison_value);
    const matched=Array.isArray(value)?value.some(item=>allowed.has(text(item))):allowed.has(text(value));
    return operator==="in"?matched:!matched;
  }
  if(Array.isArray(value)){
    const values=value.map(text);
    const target=text(rule.comparison_value);
    if(operator==="equals")return values.includes(target);
    if(operator==="not_equals")return !values.includes(target);
    if(operator==="contains")return values.some(item=>item.includes(target));
    return false;
  }
  const left=text(value);
  const right=text(rule.comparison_value);
  if(operator==="equals")return left===right;
  if(operator==="not_equals")return left!==right;
  if(operator==="contains")return left.includes(right);
  return false;
}

export function evaluateConditionalRules(fields=[],rules=[],answers={}){
  const states=Object.fromEntries(fields.map(field=>[String(field.id),{visible:true,required:!!field.required}]));
  const grouped=rules.reduce((map,rule)=>{
    const target=String(rule.target_field_id);
    if(!states[target])return map;
    map[target]=[...(map[target]||[]),rule];
    return map;
  },{});
  Object.entries(grouped).forEach(([target,targetRules])=>{
    const showRules=targetRules.filter(rule=>rule.action==="show");
    const hideRules=targetRules.filter(rule=>rule.action==="hide");
    const requireRules=targetRules.filter(rule=>rule.action==="require");
    const optionalRules=targetRules.filter(rule=>rule.action==="optional");
    const anyHide=hideRules.some(rule=>conditionMatches(rule,answers));
    const anyShow=showRules.some(rule=>conditionMatches(rule,answers));
    if(anyHide)states[target].visible=false;
    else if(showRules.length)states[target].visible=anyShow;
    else states[target].visible=true;
    requireRules.forEach(rule=>{if(conditionMatches(rule,answers))states[target].required=true});
    optionalRules.forEach(rule=>{if(conditionMatches(rule,answers))states[target].required=false});
    if(!states[target].visible)states[target].required=false;
  });
  return {field_states:states};
}
