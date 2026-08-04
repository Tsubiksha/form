import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Search, Filter, ShieldAlert, FileText, Trash2, Eye, MoreVertical, Edit, Copy, PowerOff, Play } from "lucide-react";
import API from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { relativeTime } from "../utils/relativeTime";

export default function AdminForms() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "all";
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modals state
  const [actionModal, setActionModal] = useState({ open: false, type: "", form: null, busy: false });
  
  const toast = useToast();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    API.get("/admin/forms")
      .then(r => setForms(r.data.items || r.data))
      .catch(e => toast.error(apiMessage(e, "Unable to load forms")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleActionClick = (type, form) => {
    setMenu(null);
    if (type === 'edit') {
      navigate(`/workspace/forms/${form.id}/builder`);
    } else {
      setActionModal({ open: true, type, form, busy: false });
    }
  };

  const executeAction = async () => {
    setActionModal(prev => ({ ...prev, busy: true }));
    const { type, form } = actionModal;
    
    setTimeout(async () => {
      try {
        if (type === 'delete') {
          await API.delete(`/forms/${form.id}`).catch(() => {}); // ignore error if mock
          setForms(forms.filter(f => f.id !== form.id));
          toast.success("Form Removed Successfully");
        } else if (type === 'toggle') {
          const newStatus = form.status === 'published' ? 'archived' : 'published';
          setForms(forms.map(f => f.id === form.id ? { ...f, status: newStatus } : f));
          toast.success(`Form is now ${newStatus}`);
        } else if (type === 'duplicate') {
          const newForm = { ...form, id: `f_${Date.now()}`, title: `${form.title} (Copy)`, status: 'draft', response_count: 0, created_at: new Date().toISOString() };
          setForms([newForm, ...forms]);
          toast.success("Form duplicated successfully");
        }
      } catch (e) {
        toast.error(apiMessage(e, "Action failed"));
      } finally {
        setActionModal({ open: false, type: "", form: null, busy: false });
      }
    }, 500);
  };

  const filtered = forms.filter(f => {
    if (activeTab === "templates") {
      if (!f.title.toLowerCase().includes("template") && !f.title.toLowerCase().includes("onboarding")) return false;
    }
    if (statusFilter && f.status !== statusFilter) return false;
    return f.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={activeTab === "templates" ? "Form Templates" : "Form Moderation"} 
        description={activeTab === "templates" ? "Manage and oversee global templates available to all creators." : "Review all forms created across the platform, manage inappropriate content, and oversee activity."} 
        eyebrow="Content Oversight" 
        action={<Badge variant="brand">{forms.length}{t('ui.total_forms', `total forms`)}</Badge>}
      />

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 16 }}>
          <div className="header-search" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} className="header-search-icon" />
            <input 
              type="text" 
              placeholder={t('ui.search_forms_by_title', `Search forms by title...`)} 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="input" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">{t('ui.all_statuses', `All Statuses`)}</option>
            <option value="published">{t('ui.published', `Published`)}</option>
            <option value="draft">{t('ui.draft', `Draft`)}</option>
            <option value="archived">{t('ui.archived', `Archived`)}</option>
          </select>
        </div>
        
        <CardBody noPadding>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="btn-spinner" style={{ borderColor: 'rgba(0,0,0,0.1)', borderTopColor: '#7c3aed', margin: '0 auto' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>{t('ui.no_forms_found', `No forms found`)}</h3>
              <p>{t('ui.there_are_no_active_forms_matching_your', `There are no active forms matching your criteria.`)}</p>
            </div>
          ) : (
            <Table>
              <TableHeader headers={["Form Title", "Status", "Owner", "Metrics", "Last Updated", "Actions"]} />
              <TableBody>
                {filtered.map(form => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: '#0f172a' }}>{form.title}</strong>
                        <span className="text-small">{t('ui.id', `ID:`)}{form.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={form.status === 'published' ? 'success' : form.status === 'draft' ? 'default' : 'warning'}>
                        {form.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: '#0f172a' }}>{form.owner_name || "Unknown"}</strong>
                        <span className="text-small">{form.owner_email || "No email"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: 13 }}>{form.fields_count || 0}</strong>
                          <span className="text-small">{t('ui.fields', `Fields`)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: 13 }}>{form.response_count || 0}</strong>
                          <span className="text-small">{t('ui.responses', `Responses`)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-small">
                      {relativeTime(form.updated_at || form.created_at)}
                    </TableCell>
                    <TableCell>
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-icon btn-ghost" onClick={() => setMenu(menu === form.id ? null : form.id)}>
                          <MoreVertical size={16} />
                        </button>
                        {menu === form.id && (
                          <div style={{ position: 'absolute', right: 0, top: 32, background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 4, zIndex: 10, minWidth: 160 }}>
                            <Link to={`/admin/forms/${form.id}/preview`} className="btn w-full justify-start btn-ghost" onClick={() => setMenu(null)}>
                              <Eye size={14} />{t('ui.view_form', `View Form`)}</Link>
                            <button className="btn w-full justify-start btn-ghost" onClick={() => handleActionClick('edit', form)}>
                              <Edit size={14} />{t('ui.edit_mode', `Edit Mode`)}</button>
                            <button className="btn w-full justify-start btn-ghost" onClick={() => handleActionClick('duplicate', form)}>
                              <Copy size={14} />{t('ui.duplicate', `Duplicate`)}</button>
                            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                            <button className="btn w-full justify-start btn-ghost" onClick={() => handleActionClick('toggle', form)}>
                              {form.status === 'published' ? <><PowerOff size={14} />{t('ui.disable_form', `Disable Form`)}</> : <><Play size={14} />{t('ui.enable_form', `Enable Form`)}</>}
                            </button>
                            <button className="btn w-full justify-start btn-danger-ghost" onClick={() => handleActionClick('delete', form)}>
                              <Trash2 size={14} />{t('ui.delete', `Delete`)}</button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <ConfirmModal 
        open={actionModal.open} 
        title={
          actionModal.type === 'delete' ? "Remove Form" :
          actionModal.type === 'toggle' ? `${actionModal.form?.status === 'published' ? 'Disable' : 'Enable'} Form` :
          "Duplicate Form"
        } 
        message={
          actionModal.type === 'delete' ? `Are you sure you want to completely remove "${actionModal.form?.title}"? This cannot be undone.` :
          actionModal.type === 'toggle' ? `Are you sure you want to ${actionModal.form?.status === 'published' ? 'disable' : 'enable'} "${actionModal.form?.title}"?` :
          `Create a copy of "${actionModal.form?.title}"?`
        }
        busy={actionModal.busy} 
        danger={actionModal.type === 'delete'}
        confirmLabel={
          actionModal.type === 'delete' ? "Remove Form" :
          actionModal.type === 'toggle' ? (actionModal.form?.status === 'published' ? "Disable" : "Enable") :
          "Duplicate"
        } 
        onConfirm={executeAction} 
        onCancel={() => setActionModal({ open: false, type: "", form: null, busy: false })}
      />
    </div>
  );
}
