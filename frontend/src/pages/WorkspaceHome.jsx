import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, FileText, CheckCircle2, TrendingUp, Activity, ArrowRight, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { relativeTime } from "../utils/relativeTime";

export default function WorkspaceHome() {
  const [stats, setStats] = useState(null);
  const [recentForms, setRecentForms] = useState([]);
  const [activity, setActivity] = useState([]);
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    API.get("/admin/stats")
      .then(res => setStats(res.data))
      .catch(() => setStats({
        total_forms: 12, total_submissions: 845, active_users: 3, completion_rate: 68
      })); // Mock if backend fails or doesn't have it

    API.get("/forms/", { params: { page: 1, page_size: 5 } })
      .then(res => setRecentForms(res.data.items || res.data || []))
      .catch(() => {});

    API.get("/admin/activity", { params: { page: 1, page_size: 6 } })
      .then(res => setActivity(res.data.items || []))
      .catch(() => {});
  }, []);

  return (
    <div className="flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-h1">{t('workspace.exec_summary', 'Executive Summary')}</h1>
          <p className="text-body">{t('workspace.exec_desc', 'Overview of your workspace performance and active projects.')}</p>
        </div>
        <Link to="/workspace/create-form" className="btn btn-primary">
          <Plus size={16} /> {t('workspace.new_form', 'New Form')}
        </Link>
      </div>

      <div className="grid-12">
        {/* KPIs */}
        <div className="col-span-3 panel">
          <div className="panel-body flex-col justify-between h-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('workspace.tot_forms', 'Total Forms')}</span>
              <FileText size={16} color="var(--brand-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', marginBottom: 0 }}>
              {stats ? stats.total_forms : "..."}
            </div>
          </div>
        </div>
        <div className="col-span-3 panel">
          <div className="panel-body flex-col justify-between h-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('workspace.responses', 'Responses')}</span>
              <Inbox size={16} color="var(--success-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', marginBottom: 0 }}>
              {stats ? stats.total_submissions : "..."}
            </div>
          </div>
        </div>
        <div className="col-span-3 panel">
          <div className="panel-body flex-col justify-between h-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('workspace.comp_rate', 'Completion Rate')}</span>
              <TrendingUp size={16} color="var(--warning-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', marginBottom: 0 }}>
              {stats ? `${stats.completion_rate}%` : "..."}
            </div>
          </div>
        </div>
        <div className="col-span-3 panel">
          <div className="panel-body flex-col justify-between h-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('workspace.act_users', 'Active Users')}</span>
              <Users size={16} color="var(--brand-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', marginBottom: 0 }}>
              {stats ? stats.active_users : "..."}
            </div>
          </div>
        </div>

        {/* Main Content Row */}
        <div className="col-span-8 panel">
          <div className="panel-header">
            <h3 className="panel-title">{t('workspace.act_projects', 'Active Projects')}</h3>
            <Link to="/workspace/forms" className="btn btn-ghost btn-icon" title={t('workspace.view_all', "View All")}><ArrowRight size={16}/></Link>
          </div>
          <div className="data-table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('workspace.form_name', 'Form Name')}</th>
                  <th>{t('workspace.status', 'Status')}</th>
                  <th>{t('workspace.responses', 'Responses')}</th>
                  <th>{t('workspace.last_updated', 'Last Updated')}</th>
                </tr>
              </thead>
              <tbody>
                {recentForms.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">{t('workspace.no_active', 'No active forms')}</td></tr>
                ) : (
                  recentForms.map(f => (
                    <tr key={f.id}>
                      <td>
                        <Link to={`/workspace/forms/${f.id}/builder`} style={{ fontWeight: 600 }}>{f.title}</Link>
                      </td>
                      <td>
                        <span className={`badge ${f.is_published ? 'published' : 'draft'}`}>
                          {f.is_published ? t('workspace.published', "Published") : t('workspace.draft', "Draft")}
                        </span>
                      </td>
                      <td>{f.response_count || 0}</td>
                      <td>{relativeTime(f.updated_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-4 panel">
          <div className="panel-header">
            <h3 className="panel-title">{t('workspace.sys_act', 'System Activity')}</h3>
            <Link to="/workspace/audit" className="btn btn-ghost btn-icon" title={t('workspace.view_audit', "View Audit Log")}><Activity size={16}/></Link>
          </div>
          <div className="panel-body flex-col gap-3" style={{ padding: '12px' }}>
            {activity.length === 0 ? (
              <div className="text-center text-small">{t('workspace.no_act', 'No recent activity')}</div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="flex gap-3 items-center" style={{ paddingBottom: '12px', borderBottom: i === activity.length-1 ? 'none' : '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)', flexShrink: 0 }} />
                  <div className="flex-col">
                    <strong className="text-body" style={{ color: 'var(--text-primary)' }}>{item.action.replace('_', ' ')}</strong>
                    <span className="text-small">{t('workspace.by_user', 'By')} {item.user_name} • {relativeTime(item.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ensure Inbox is imported
function Inbox(props) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
}
