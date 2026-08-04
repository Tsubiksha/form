import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Activity, Archive, CheckCircle2, ChevronLeft, ChevronRight, FilePlus2, FileX2, RefreshCw, Search, UserCheck, UserX, X } from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { relativeTime } from "../utils/relativeTime";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

const ACTION_FILTERS = [
  ["", "All Actions"], ["created", "Created"], ["updated", "Updated"],
  ["published", "Published"], ["deleted", "Deleted"], ["archived", "Archived"],
  ["user_activated", "User Activated"], ["user_deactivated", "User Deactivated"],
  ["duplicated", "Duplicated"], ["bulk_deleted", "Bulk Deleted"]
];

function activityMeta(action = "") {
  if (action.includes("deactivated")) return { Icon: UserX, tone: "#d97706", bg: "#fffbeb" };
  if (action.includes("activated"))   return { Icon: UserCheck, tone: "#16a34a", bg: "#f0fdf4" };
  if (action.includes("publish"))     return { Icon: CheckCircle2, tone: "#7c3aed", bg: "#f5f3ff" };
  if (action.includes("delete") || action.includes("bulk_delete")) return { Icon: FileX2, tone: "#dc2626", bg: "#fef2f2" };
  if (action.includes("archive"))     return { Icon: Archive, tone: "#d97706", bg: "#fffbeb" };
  if (action.includes("update") || action.includes("restored")) return { Icon: RefreshCw, tone: "#2563eb", bg: "#eff6ff" };
  if (action.includes("creat") || action.includes("duplicat")) return { Icon: FilePlus2, tone: "#16a34a", bg: "#f0fdf4" };
  return { Icon: Activity, tone: "#64748b", bg: "#f1f5f9" };
}

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const [activity, setActivity] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [controls, setControls] = useState({ search: "", action: "", sort: "desc" });
  const toast = useToast();

  const loadActivity = useCallback(() => {
    setLoading(true);
    API.get("/admin/activity", {
      params: { page, page_size: 30, search: controls.search || undefined, action: controls.action || undefined, sort: controls.sort }
    })
      .then(r => setActivity(r.data))
      .catch(e => toast.error(apiMessage(e, "Unable to load audit log")))
      .finally(() => setLoading(false));
  }, [controls, page, toast]);

  useEffect(() => { const t = setTimeout(loadActivity, 200); return () => clearTimeout(t); }, [loadActivity]);
  const update = (key, value) => {
    setPage(1); setControls(c => ({ ...c, [key]: value })); 
  };
  const pages = Math.max(1, Math.ceil(activity.total / 30));

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={t('ui.audit_log', `Audit Log`)} 
        description="Chronological trail of all platform actions, security events, and user activity." 
        eyebrow="Security & Compliance"
        action={<Badge variant="brand">{activity.total}{t('ui.total_events', `total events`)}</Badge>}
      />

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="header-search" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} className="header-search-icon" />
            <input
              type="text"
              placeholder={t('ui.search_events', `Search events...`)}
              value={controls.search}
              onChange={e => update("search", e.target.value)}
            />
          </div>
          <select className="input" style={{ width: 180 }} value={controls.action} onChange={e => update("action", e.target.value)}>
            {ACTION_FILTERS.map(([val, label]) => <option value={val} key={val}>{label}</option>)}
          </select>
          <select className="input" style={{ width: 150 }} value={controls.sort} onChange={e => update("sort", e.target.value)}>
            <option value="desc">{t('ui.newest_first', `Newest first`)}</option>
            <option value="asc">{t('ui.oldest_first', `Oldest first`)}</option>
          </select>
        </div>

        <CardBody noPadding>
          <Table>
            <TableHeader headers={["Timestamp", "User", "Action", "Module", "Details"]} />
            <TableBody>
              {loading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan="4">
                      <div className="skeleton" style={{ height: 14, borderRadius: 4, width: '100%' }} />
                    </TableCell>
                  </TableRow>
                ))
              ) : activity.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="4">
                    <div className="empty-state">
                      <Activity size={36} style={{ color: '#cbd5e1' }} />
                      <h3>{t('ui.no_activity_found', `No activity found`)}</h3>
                      <p>{t('ui.try_adjusting_the_filters_or_search_term', `Try adjusting the filters or search term.`)}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activity.items.map(item => {
                  const { Icon, tone, bg } = activityMeta(item.action);
                  return (
                    <TableRow key={item.id} style={{ borderLeft: `3px solid ${tone}` }}>
                      <TableCell>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                            {item.user_name ? item.user_name[0].toUpperCase() : '?'}
                          </div>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.user_name}</strong>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: bg, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={12} />
                          </div>
                          <span style={{ fontSize: 13, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                            {item.action.replace(/_/g, " ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell style={{ color: 'var(--text-secondary)' }}>
                        {item.entity_type.charAt(0).toUpperCase() + item.entity_type.slice(1)}
                      </TableCell>
                      <TableCell>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                          {item.entity_id ? `ID #${item.entity_id}` : 'General Update'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardBody>

        {activity.total > 30 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />{t('ui.previous', `Previous`)}</button>
            <span className="text-small">{t('ui.page', `Page`)}{page}{t('ui.of', `of`)}{pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>{t('ui.next', `Next`)}<ChevronRight size={14} />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
