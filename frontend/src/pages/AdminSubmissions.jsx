import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Search, Eye, Download, Trash2, CheckCircle2, Clock, Inbox, Filter, X } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ToastProvider";
import { relativeTime } from "../utils/relativeTime";
import ConfirmModal from "../components/ConfirmModal";

const mockSubmissions = [
  { id: "sub_10932", form: "Employee Onboarding", user: "Alice Johnson", date: new Date(Date.now() - 3600000 * 2).toISOString(), status: "completed", data: { name: "Alice", dept: "Engineering" } },
  { id: "sub_10931", form: "Expense Reimbursement", user: "Bob Smith", date: new Date(Date.now() - 3600000 * 5).toISOString(), status: "pending", data: { amount: "$500", reason: "Travel" } },
  { id: "sub_10930", form: "IT Support Request", user: "Charlie Davis", date: new Date(Date.now() - 3600000 * 24).toISOString(), status: "completed", data: { issue: "Laptop won't start", priority: "High" } },
  { id: "sub_10929", form: "Employee Onboarding", user: "Diana Prince", date: new Date(Date.now() - 3600000 * 48).toISOString(), status: "rejected", data: { name: "Diana", dept: "HR" } },
  { id: "sub_10928", form: "Q3 Feedback Survey", user: "Anonymous", date: new Date(Date.now() - 3600000 * 72).toISOString(), status: "completed", data: { rating: 5, comment: "Great quarter!" } },
];

const ResponseModal = ({ open, sub, onClose }) => {
  const { t } = useTranslation();
  if (!open || !sub) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" style={{ padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('ui.submission_details', `Submission Details`)}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('ui.id', `ID`)}</span>
              <div style={{ fontWeight: 500 }}>{sub.id}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('ui.form', `Form`)}</span>
              <div style={{ fontWeight: 500 }}>{sub.form}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('ui.submitted_by', `Submitted By`)}</span>
              <div style={{ fontWeight: 500 }}>{sub.user}</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('ui.status', `Status`)}</span>
              <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{sub.status}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' }}>{t('ui.response_data', `Response Data`)}</span>
            <pre style={{ background: 'var(--gray-50)', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(sub.data, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function AdminSubmissions() {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [search, setSearch] = useState("");
  const [selectedDelete, setSelectedDelete] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const toast = useToast();

  const removeSubmission = () => {
    setSubmissions(submissions.filter(s => s.id !== selectedDelete.id));
    toast.success(`Submission ${selectedDelete.id} deleted successfully`);
    setSelectedDelete(null);
  };

  const handleExport = (sub) => {
    if (sub) toast.success(`Exported data for ${sub.id}`);
    else toast.success(`Exported ${filtered.length} submissions as CSV`);
  };

  const filtered = submissions.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) || 
    s.form.toLowerCase().includes(search.toLowerCase()) ||
    s.user.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={t('ui.global_submissions', `Global Submissions`)} 
        description="Monitor and manage all form submissions across the platform in real-time." 
        eyebrow="Data Operations"
        action={<Badge variant="brand">{submissions.length}{t('ui.total_entries', `total entries`)}</Badge>}
      />

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 16 }}>
          <div className="header-search" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} className="header-search-icon" />
            <input 
              type="text" 
              placeholder={t('ui.search_id_form_or_user', `Search ID, form, or user...`)} 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost">
            <Filter size={16} />{t('ui.filter', `Filter`)}</button>
          <button className="btn btn-secondary" onClick={() => handleExport()}>
            <Download size={16} />{t('ui.export_all', `Export All`)}</button>
        </div>

        <CardBody noPadding>
          <Table>
            <TableHeader headers={["Submission ID", "Form Name", "Submitted By", "Date", "Status", "Actions"]} />
            <TableBody>
              {filtered.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Inbox size={14} style={{ color: 'var(--text-tertiary)' }} />
                      <strong style={{ fontFamily: 'monospace', color: 'var(--brand-600)' }}>{sub.id}</strong>
                    </div>
                  </TableCell>
                  <TableCell>
                    <strong style={{ color: 'var(--text-primary)' }}>{sub.form}</strong>
                  </TableCell>
                  <TableCell>
                    <span style={{ color: 'var(--text-secondary)' }}>{sub.user}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-small">{relativeTime(sub.date)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'completed' ? 'success' : sub.status === 'pending' ? 'warning' : 'danger'}>
                      {sub.status === 'completed' && <CheckCircle2 size={12} style={{ marginRight: 4 }} />}
                      {sub.status === 'pending' && <Clock size={12} style={{ marginRight: 4 }} />}
                      {sub.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-icon btn-ghost" onClick={() => setSelectedView(sub)} title={t('ui.view_response', `View Response`)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn-icon btn-ghost" onClick={() => handleExport(sub)} title={t('ui.export_data', `Export Data`)}>
                        <Download size={14} />
                      </button>
                      <button className="btn-icon btn-danger-ghost" onClick={() => setSelectedDelete(sub)} title={t('ui.delete_submission', `Delete Submission`)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <ResponseModal open={!!selectedView} sub={selectedView} onClose={() => setSelectedView(null)} />

      <ConfirmModal 
        open={!!selectedDelete} 
        title={t('ui.delete_submission', `Delete Submission`)} 
        message={`Are you sure you want to delete submission ${selectedDelete?.id}? This data will be permanently lost.`}
        busy={false} 
        confirmLabel="Delete" 
        onConfirm={removeSubmission} 
        onCancel={() => setSelectedDelete(null)}
      />
    </div>
  );
}
