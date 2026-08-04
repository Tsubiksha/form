import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GitMerge, MoreVertical, Play, Pause, Eye, Edit, Copy, Trash2, ArrowRight, Search } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ToastProvider";
import ConfirmModal from "../components/ConfirmModal";
import { relativeTime } from "../utils/relativeTime";

// Expanded Mock data
const mockWorkflows = [
  {
    id: "wf_1",
    name: "Employee Onboarding",
    owner: "Admin User",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    last_modified: new Date(Date.now() - 86400000 * 1).toISOString(),
    num_forms: 3,
    total_executions: 1240,
    success_rate: "98.5%",
    steps: ["Employee Submission", "Manager Approval", "HR Approval", "Completed"]
  },
  {
    id: "wf_2",
    name: "Expense Reimbursement",
    owner: "Finance Team",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    last_modified: new Date(Date.now() - 86400000 * 2).toISOString(),
    num_forms: 1,
    total_executions: 4500,
    success_rate: "94.2%",
    steps: ["User Submission", "Manager Approval", "Finance Audit", "Payout"]
  },
  {
    id: "wf_3",
    name: "IT Support Request",
    owner: "IT Dept",
    status: "inactive",
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    last_modified: new Date(Date.now() - 86400000 * 15).toISOString(),
    num_forms: 2,
    total_executions: 310,
    success_rate: "89.0%",
    steps: ["Ticket Created", "Triage", "Resolution", "Closed"]
  }
];

const HorizontalStepper = ({ steps }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
    {steps.map((step, index) => (
      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
            {index + 1}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{step}</span>
        </div>
        {index < steps.length - 1 && (
          <ArrowRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        )}
      </div>
    ))}
  </div>
);

export default function AdminWorkflows() {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState(mockWorkflows);
  const [menu, setMenu] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", owner: "", sort: "newest" });
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({ open: false, type: "", wf: null, busy: false });
  
  const toast = useToast();
  const navigate = useNavigate();

  const handleAction = (type, wf) => {
    setMenu(null);
    if (type === 'view') {
      navigate(`/admin/workflows/${wf.id}`);
    } else if (type === 'edit') {
      toast.info("Opening workflow builder...");
    } else if (type === 'duplicate') {
      setConfirmModal({ open: true, type: 'duplicate', wf, busy: false });
    } else if (type === 'toggle') {
      setConfirmModal({ open: true, type: 'toggle', wf, busy: false });
    } else if (type === 'delete') {
      setConfirmModal({ open: true, type: 'delete', wf, busy: false });
    }
  };

  const executeAction = () => {
    setConfirmModal(prev => ({ ...prev, busy: true }));
    setTimeout(() => {
      const { type, wf } = confirmModal;
      
      if (type === 'delete') {
        setWorkflows(workflows.filter(w => w.id !== wf.id));
        toast.success(`Workflow "${wf.name}" deleted.`);
      } else if (type === 'toggle') {
        setWorkflows(workflows.map(w => w.id === wf.id ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' } : w));
        toast.success(`Workflow "${wf.name}" is now ${wf.status === 'active' ? 'inactive' : 'active'}.`);
      } else if (type === 'duplicate') {
        const newWf = { ...wf, id: `wf_${Date.now()}`, name: `${wf.name} (Copy)`, created_at: new Date().toISOString(), last_modified: new Date().toISOString(), num_forms: 0, total_executions: 0, success_rate: "N/A" };
        setWorkflows([newWf, ...workflows]);
        toast.success(`Workflow duplicated successfully.`);
      }
      
      setConfirmModal({ open: false, type: "", wf: null, busy: false });
    }, 600);
  };

  const filteredWorkflows = useMemo(() => {
    return workflows
      .filter(w => {
        if (filters.search && !w.name.toLowerCase().includes(filters.search.toLowerCase()) && !w.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.status && w.status !== filters.status) return false;
        if (filters.owner && w.owner !== filters.owner) return false;
        return true;
      })
      .sort((a, b) => {
        if (filters.sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (filters.sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        return 0;
      });
  }, [workflows, filters]);

  const uniqueOwners = useMemo(() => Array.from(new Set(workflows.map(w => w.owner))), [workflows]);

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={t('ui.workflow_management', `Workflow Management`)} 
        description="Oversee active multi-step logic paths, approval chains, and automated triggers." 
        eyebrow="Automation Engine" 
        action={
          <button className="btn btn-primary" onClick={() => toast.info("Create new workflow")}>
            <GitMerge size={16} />{t('ui.create_workflow', `Create Workflow`)}</button>
        }
      />

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="header-search" style={{ flex: 1, minWidth: 240, maxWidth: 320 }}>
            <Search size={14} className="header-search-icon" />
            <input 
              type="text" 
              placeholder={t('ui.search_by_name_or_id', `Search by name or ID...`)} 
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select className="input" style={{ width: 140 }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t('ui.all_statuses', `All Statuses`)}</option>
            <option value="active">{t('ui.active', `Active`)}</option>
            <option value="inactive">{t('ui.inactive', `Inactive`)}</option>
          </select>
          <select className="input" style={{ width: 140 }} value={filters.owner} onChange={e => setFilters({ ...filters, owner: e.target.value })}>
            <option value="">{t('ui.all_owners', `All Owners`)}</option>
            {uniqueOwners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
          <select className="input" style={{ width: 140 }} value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
            <option value="newest">{t('ui.recently_created', `Recently Created`)}</option>
            <option value="oldest">{t('ui.oldest_first', `Oldest First`)}</option>
          </select>
        </div>

        <CardBody noPadding>
          {filteredWorkflows.length === 0 ? (
            <div className="empty-state">
              <GitMerge size={48} />
              <h3>{t('ui.no_workflows_found', `No workflows found`)}</h3>
              <p>{t('ui.try_adjusting_your_search_or_filters', `Try adjusting your search or filters.`)}</p>
            </div>
          ) : (
            <Table>
              <TableHeader headers={["Workflow Details", "Metrics", "Flow Visualization", "Actions"]} />
              <TableBody>
                {filteredWorkflows.map(wf => (
                  <TableRow key={wf.id} style={{ verticalAlign: 'top' }}>
                    {/* Workflow Details Column */}
                    <TableCell>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <GitMerge size={18} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>{wf.name}</strong>
                            <Badge variant={wf.status === 'active' ? 'success' : 'default'} style={{ fontSize: 10, padding: '2px 6px' }}>
                              {wf.status.toUpperCase()}
                            </Badge>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{t('ui.id', `ID:`)}{wf.id}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('ui.owner', `Owner:`)}<strong>{wf.owner}</strong></span>
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                            <span>{t('ui.created', `Created:`)}{relativeTime(wf.created_at)}</span>
                            <span>{t('ui.modified', `Modified:`)}{relativeTime(wf.last_modified)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Metrics Column */}
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('ui.steps', `Steps`)}</span>
                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{wf.steps.length}</strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('ui.forms', `Forms`)}</span>
                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{wf.num_forms}</strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('ui.executions', `Executions`)}</span>
                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{wf.total_executions.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{t('ui.success', `Success`)}</span>
                            <strong style={{ fontSize: 13, color: 'var(--success-600)' }}>{wf.success_rate}</strong>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Flow Visualization Column */}
                    <TableCell style={{ maxWidth: '350px' }}>
                      <HorizontalStepper steps={wf.steps} />
                    </TableCell>

                    {/* Actions Column */}
                    <TableCell>
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-icon btn-ghost" onClick={() => setMenu(menu === wf.id ? null : wf.id)}>
                          <MoreVertical size={16} />
                        </button>
                        {menu === wf.id && (
                          <div style={{ position: 'absolute', right: 0, top: 32, background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 4, zIndex: 10, minWidth: 160 }}>
                            <button className="btn w-full justify-start btn-ghost" onClick={() => handleAction('view', wf)}>
                              <Eye size={14} />{t('ui.view_details', `View Details`)}</button>
                            <button className="btn w-full justify-start btn-ghost" onClick={() => handleAction('edit', wf)}>
                              <Edit size={14} />{t('ui.edit_workflow', `Edit Workflow`)}</button>
                            <button className="btn w-full justify-start btn-ghost" onClick={() => handleAction('duplicate', wf)}>
                              <Copy size={14} />{t('ui.duplicate', `Duplicate`)}</button>
                            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                            <button className={`btn w-full justify-start btn-ghost`} onClick={() => handleAction('toggle', wf)}>
                              {wf.status === 'active' ? (
                                <><Pause size={14}/>{t('ui.deactivate', `Deactivate`)}</>
                              ) : (
                                <><Play size={14}/>{t('ui.activate', `Activate`)}</>
                              )}
                            </button>
                            <button className="btn w-full justify-start btn-danger-ghost" onClick={() => handleAction('delete', wf)}>
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
        open={confirmModal.open}
        title={
          confirmModal.type === 'delete' ? "Delete Workflow" :
          confirmModal.type === 'toggle' ? `${confirmModal.wf?.status === 'active' ? 'Deactivate' : 'Activate'} Workflow` :
          "Duplicate Workflow"
        }
        message={
          confirmModal.type === 'delete' ? `Are you sure you want to delete "${confirmModal.wf?.name}"? This action cannot be undone and will break any forms currently using this workflow.` :
          confirmModal.type === 'toggle' ? `Are you sure you want to ${confirmModal.wf?.status === 'active' ? 'deactivate' : 'activate'} "${confirmModal.wf?.name}"?` :
          `Create a duplicate of "${confirmModal.wf?.name}"?`
        }
        confirmLabel={
          confirmModal.type === 'delete' ? "Delete" :
          confirmModal.type === 'toggle' ? (confirmModal.wf?.status === 'active' ? "Deactivate" : "Activate") :
          "Duplicate"
        }
        busyLabel="Processing..."
        danger={confirmModal.type === 'delete'}
        busy={confirmModal.busy}
        onConfirm={executeAction}
        onCancel={() => setConfirmModal({ open: false, type: "", wf: null, busy: false })}
      />
    </div>
  );
}

