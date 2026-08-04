import { useTranslation } from "react-i18next";
import {useMemo} from "react";
import {ArrowRight,Eye,EyeOff,Lock,Unlock} from "lucide-react";

const ACTION_META={
  show:{label:"Show",Icon:Eye,cls:"green"},
  hide:{label:"Hide",Icon:EyeOff,cls:"red"},
  require:{label:"Required",Icon:Lock,cls:"amber"},
  optional:{label:"Optional",Icon:Unlock,cls:"blue"},
};
const OP_LABELS={equals:"=",not_equals:"≠",contains:"contains",greater_than:">",less_than:"<",is_empty:"is empty",is_not_empty:"is not empty",in:"in",not_in:"not in"};

/**
 * RuleVisualizer — displays conditional logic rules as a readable visual list.
 * Props:
 *   rules  – array of ConditionalRule objects
 *   fields – array of Field objects (for label lookup)
 */
export default function RuleVisualizer({rules=[],fields=[]}){
  const { t } = useTranslation();
  const fieldMap=useMemo(()=>Object.fromEntries(fields.map(f=>[f.id,f.label||`Field ${f.id}`])),[fields]);

  if(!rules.length){
    return(
      <div className="rule-visualizer-empty">
        <p>{t('ui.no_conditional_rules_yet_add_a_rule_abov', `No conditional rules yet. Add a rule above to create dynamic form behaviour.`)}</p>
      </div>
    );
  }

  // Group by trigger field for a more readable layout
  const grouped=useMemo(()=>{
    const map=new Map();
    for(const rule of rules){
      const key=rule.trigger_field_id;
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(rule);
    }
    return map;
  },[rules]);

  return(
    <div className="rule-visualizer">
      {[...grouped.entries()].map(([triggerId,groupRules])=>{
        const triggerLabel=fieldMap[triggerId]||`Field ${triggerId}`;
        return(
          <div className="rule-group" key={triggerId}>
            <div className="rule-trigger">
              <span className="rule-field-chip trigger">{triggerLabel}</span>
            </div>
            <div className="rule-arrows">
              {groupRules.map(rule=>{
                const meta=ACTION_META[rule.action]||{label:rule.action,Icon:ArrowRight,cls:"gray"};
                const{Icon,label,cls}=meta;
                const op=OP_LABELS[rule.operator]||rule.operator;
                const targetLabel=fieldMap[rule.target_field_id]||`Field ${rule.target_field_id}`;
                return(
                  <div className="rule-arrow-row" key={rule.id}>
                    <div className="rule-condition">
                      {rule.operator&&!["is_empty","is_not_empty"].includes(rule.operator)
                        ?<span><em>{op}</em> <strong>{rule.comparison_value}</strong></span>
                        :<span><em>{op}</em></span>
                      }
                    </div>
                    <ArrowRight className="rule-arrow-icon"/>
                    <span className={`rule-action-badge ${cls}`}><Icon/>{label}</span>
                    <ArrowRight className="rule-arrow-icon"/>
                    <span className="rule-field-chip target">{targetLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
