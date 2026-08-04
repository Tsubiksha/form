import { useTranslation } from "react-i18next";
import { useState } from "react";
import { CheckSquare, Search, Edit, Trash2, Plus, ArrowRight, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ToastProvider";
import ConfirmModal from "../components/ConfirmModal";

const mockLogicRules = [
  { id: "lr_1", name: "Hide License Field", condition: "IF Age < 18", action: "THEN Hide Driving License Field", target_form: "Driver Application", status: "active" },
  { id: "lr_2", name: "Require Signature", condition: "IF Loan Amount > $10,000", action: "THEN Require Manager Signature", target_form: "Loan Application", status: "active" },
  { id: "lr_3", name: "Skip Page 2", condition: "IF State = 'NY'", action: "THEN Skip to Page 3", target_form: "Tax Form", status: "inactive" }
];

const mockValidationRules = [
  { id: "vr_1", name: "Email Format", field: "Email Address", constraints: ["Required: true", "Pattern: /.+@.+\\..+/"], error_msg: "Invalid email format", status: "active" },
  { id: "vr_2", name: "Strong Password", field: "Password", constraints: ["Min Length: 8", "Require Number: true", "Require Special: true"], error_msg: "Password not strong enough", status: "active" },
  { id: "vr_3", name: "Age Limit", field: "Age", constraints: ["Min: 18", "Max: 120"], error_msg: "Must be at least 18", status: "active" }
];

const RuleModal = ({ open, rule, type, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(rule || { name: "", target_form: "", condition: "", action: "", field: "", error_msg: "", status: "active", constraints: [] });
  
  if (!open) return null;

  const isLogic = type === 'logic';

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" style={{ padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '450px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{rule ? 'Edit Rule' : `New ${isLogic ? 'Logic' : 'Validation'} Rule`}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="label">{t('ui.rule_name', `Rule Name`)}</label>
            <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          {isLogic ? (
            <>
              <div className="form-group">
                <label className="label">{t('ui.target_form', `Target Form`)}</label>
                <input type="text" className="input" value={formData.target_form} onChange={e => setFormData({ ...formData, target_form: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">{t('ui.condition_if', `Condition (IF)`)}</label>
                <input type="text" className="input" value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">{t('ui.action_then', `Action (THEN)`)}</label>
                <input type="text" className="input" value={formData.action} onChange={e => setFormData({ ...formData, action: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="label">{t('ui.target_field', `Target Field`)}</label>
                <input type="text" className="input" value={formData.field} onChange={e => setFormData({ ...formData, field: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">{t('ui.constraints_comma_separated', `Constraints (comma separated)`)}</label>
                <input type="text" className="input" value={formData.constraints?.join(', ')} onChange={e => setFormData({ ...formData, constraints: e.target.value.split(',').map(s=>s.trim()) })} />
              </div>
              <div className="form-group">
                <label className="label">{t('ui.error_message', `Error Message`)}</label>
                <input type="text" className="input" value={formData.error_msg} onChange={e => setFormData({ ...formData, error_msg: e.target.value })} />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="label">{t('ui.status', `Status`)}</label>
            <select className="input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
              <option value="active">{t('ui.active', `Active`)}</option>
              <option value="inactive">{t('ui.inactive', `Inactive`)}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('ui.cancel', `Cancel`)}</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              onSave({ ...formData, id: formData.id || `r_${Date.now()}` });
              onClose();
            }}>{t('ui.save_rule', `Save Rule`)}</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function AdminRules() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("logic");
  const [logicRules, setLogicRules] = useState(mockLogicRules);
  const [validationRules, setValidationRules] = useState(mockValidationRules);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const [ruleModal, setRuleModal] = useState({ open: false, rule: null, type: 'logic' });
  const [deleteModal, setDeleteModal] = useState({ open: false, rule: null, type: 'logic' });

  const confirmDelete = () => {
    if (deleteModal.type === 'logic') {
      setLogicRules(logicRules.filter(r => r.id !== deleteModal.rule.id));
    } else {
      setValidationRules(validationRules.filter(r => r.id !== deleteModal.rule.id));
    }
    toast.success("Rule deleted successfully");
    setDeleteModal({ open: false, rule: null, type: 'logic' });
  };

  const handleSaveRule = (savedRule) => {
    if (ruleModal.type === 'logic') {
      if (ruleModal.rule) setLogicRules(logicRules.map(r => r.id === savedRule.id ? savedRule : r));
      else setLogicRules([savedRule, ...logicRules]);
    } else {
      if (ruleModal.rule) setValidationRules(validationRules.map(r => r.id === savedRule.id ? savedRule : r));
      else setValidationRules([savedRule, ...validationRules]);
    }
    toast.success("Rule saved successfully");
  };

  const filteredLogic = logicRules.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.target_form || "").toLowerCase().includes(search.toLowerCase()));
  const filteredValidation = validationRules.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.field || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={t('ui.rules_validation_engine', `Rules & Validation Engine`)} 
        description="Configure dynamic conditional logic and data validation constraints across all forms." 
        eyebrow="System Configuration"
        action={
          <button className="btn btn-primary" onClick={() => setRuleModal({ open: true, rule: null, type: activeTab })}>
            <Plus size={16} />{t('ui.create_rule', `Create Rule`)}</button>
        }
      />

      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <button 
          className={`btn ${activeTab === 'logic' ? 'btn-secondary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('logic')}
        >
          <SlidersHorizontal size={16} />{t('ui.conditional_logic', `Conditional Logic`)}</button>
        <button 
          className={`btn ${activeTab === 'validation' ? 'btn-secondary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('validation')}
        >
          <CheckSquare size={16} />{t('ui.data_validation', `Data Validation`)}</button>
      </div>

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="header-search" style={{ maxWidth: 400 }}>
            <Search size={14} className="header-search-icon" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab} rules...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <CardBody noPadding>
          {activeTab === 'logic' ? (
            <Table>
              <TableHeader headers={["Rule Name", "Target Form", "Logic Definition", "Status", "Actions"]} />
              <TableBody>
                {filteredLogic.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell><strong style={{ color: 'var(--text-primary)' }}>{rule.name}</strong></TableCell>
                    <TableCell><span style={{ color: 'var(--text-secondary)' }}>{rule.target_form}</span></TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <code style={{ fontSize: 12, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px 6px', borderRadius: 4 }}>{rule.condition}</code>
                        <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <code style={{ fontSize: 12, color: 'var(--success-600)', background: 'var(--success-50)', padding: '2px 6px', borderRadius: 4 }}>{rule.action}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.status === 'active' ? 'success' : 'default'}>{rule.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-icon btn-ghost" onClick={() => setRuleModal({ open: true, rule, type: 'logic' })}><Edit size={14} /></button>
                        <button className="btn-icon btn-danger-ghost" onClick={() => setDeleteModal({ open: true, rule, type: 'logic' })}><Trash2 size={14} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader headers={["Rule Name", "Target Field", "Constraints", "Error Message", "Status", "Actions"]} />
              <TableBody>
                {filteredValidation.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell><strong style={{ color: 'var(--text-primary)' }}>{rule.name}</strong></TableCell>
                    <TableCell><span style={{ color: 'var(--text-secondary)' }}>{rule.field}</span></TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {rule.constraints?.map((c, i) => (
                          <Badge key={i} variant="brand" style={{ background: 'var(--gray-100)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>{c}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><span style={{ fontSize: 12, color: 'var(--danger-600)', display: 'flex', alignItems: 'center', gap: 4 }}><ShieldAlert size={12}/> {rule.error_msg}</span></TableCell>
                    <TableCell>
                      <Badge variant={rule.status === 'active' ? 'success' : 'default'}>{rule.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-icon btn-ghost" onClick={() => setRuleModal({ open: true, rule, type: 'validation' })}><Edit size={14} /></button>
                        <button className="btn-icon btn-danger-ghost" onClick={() => setDeleteModal({ open: true, rule, type: 'validation' })}><Trash2 size={14} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <RuleModal 
        open={ruleModal.open} 
        rule={ruleModal.rule} 
        type={ruleModal.type} 
        onClose={() => setRuleModal({ open: false, rule: null, type: 'logic' })} 
        onSave={handleSaveRule} 
      />

      <ConfirmModal
        open={deleteModal.open}
        title={t('ui.delete_rule', `Delete Rule`)}
        message={`Are you sure you want to delete "${deleteModal.rule?.name}"?`}
        danger={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, rule: null, type: 'logic' })}
      />
    </div>
  );
}
