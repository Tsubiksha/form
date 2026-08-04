import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ChevronLeft, Download, TrendingUp, Users, Zap, Clock } from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { relativeTime } from "../utils/relativeTime";

const FIELD_COLORS = ["var(--brand-500)", "var(--success-500)", "var(--warning-500)", "var(--info-500)", "var(--danger-500)", "var(--brand-600)", "var(--warning-400)", "var(--success-600)"];
const CHART_FIELD_TYPES = new Set(["dropdown", "radio", "multi_select", "checkbox_group", "rating"]);

function fmt(secs) {
  if (!secs && secs !== 0) return "—";
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function FieldChart({ stat }) {
  const dist = stat.distribution || {};
  const entries = Object.entries(dist);
  if (!entries.length) return <div className="empty-state" style={{ height: '200px', padding: 0 }}><p>{t('ui.no_data_yet', `No data yet.`)}</p></div>;
  if (stat.field_type === "rating") {
    const data = entries.sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => ({ name: `★${k}`, value: v }));
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'var(--gray-100)' }} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: 'var(--shadow-sm)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={FIELD_COLORS[i % FIELD_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const data = entries.map(([name, value]) => ({ name, value }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={FIELD_COLORS[i % FIELD_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => `${v} (${total ? Math.round(v / total * 100) : 0}%)`} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: 'var(--shadow-sm)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function FormAnalytics() {
  const { t } = useTranslation();
  const { formId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    API.get(`/forms/${formId}/analytics`)
      .then(r => setData(r.data))
      .catch(e => toast.error(apiMessage(e, "Unable to load analytics")))
      .finally(() => setLoading(false));
  }, [formId, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex-col gap-4">
      <div className="skeleton" style={{ width: 120, height: 18, marginBottom: 16 }} />
      <div className="grid-12">
        {[1, 2, 3, 4].map(i => <div className="col-span-3 panel skeleton" style={{ height: 100 }} key={i} />)}
      </div>
      <div className="panel skeleton" style={{ height: 280, marginTop: 16 }} />
    </div>
  );

  if (!data) return <div className="empty-state"><h3>{t('ui.analytics_not_available', `Analytics not available`)}</h3></div>;

  const chartable = data.field_stats.filter(f => CHART_FIELD_TYPES.has(f.field_type));
  const trend = (data.daily_submissions || []).map(d => ({ date: d.date, submissions: d.count }));

  return (
    <div className="flex-col gap-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/workspace/forms" className="btn-icon btn-ghost"><ChevronLeft size={18} /></Link>
          <div className="flex-col">
            <h1 className="text-h2" style={{ margin: 0 }}>{t('ui.analytics', `Analytics:`)}{data.form_title}</h1>
            <span className="text-small">{t('ui.detailed_insights_and_performance', `Detailed insights and performance`)}</span>
          </div>
        </div>
        <Link to="/workspace/exports" className="btn btn-secondary">
          <Download size={16} />{t('ui.export_data', `Export Data`)}</Link>
      </div>

      <div className="grid-12">
        <div className="col-span-3 panel p-4">
          <div className="panel-body flex-col justify-between h-full" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('ui.views', `Views`)}</span>
              <Activity size={16} color="var(--brand-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', margin: 0 }}>{data.total_opens}</div>
            <div className="text-small mt-2">{data.total_submissions}{t('ui.submissions', `submissions`)}</div>
          </div>
        </div>
        
        <div className="col-span-3 panel p-4">
          <div className="panel-body flex-col justify-between h-full" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('ui.completion_rate', `Completion Rate`)}</span>
              <TrendingUp size={16} color="var(--success-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', margin: 0 }}>{data.completion_rate != null ? `${data.completion_rate}%` : "—"}</div>
          </div>
        </div>

        <div className="col-span-3 panel p-4">
          <div className="panel-body flex-col justify-between h-full" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('ui.average_time_spent', `Average Time Spent`)}</span>
              <Clock size={16} color="var(--warning-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '28px', margin: 0 }}>{fmt(data.avg_completion_time_seconds)}</div>
          </div>
        </div>

        <div className="col-span-3 panel p-4">
          <div className="panel-body flex-col justify-between h-full" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-label">{t('ui.most_skipped_question', `Most Skipped Question`)}</span>
              <Zap size={16} color="var(--danger-primary)" />
            </div>
            <div className="text-h1" style={{ fontSize: '16px', margin: 0, fontWeight: 600, lineHeight: 1.2 }}>
              {data.field_stats && data.field_stats.length > 0 
                ? (() => {
                    const sorted = [...data.field_stats].sort((a,b) => b.null_count - a.null_count);
                    return sorted[0].null_count > 0 ? sorted[0].label : "None";
                  })()
                : "—"}
            </div>
          </div>
        </div>

        <div className="col-span-12 panel">
          <div className="panel-header">
            <h3 className="panel-title">{t('ui.submissions_over_time', `Submissions Over Time`)}</h3>
            <select className="input" style={{ width: '120px', height: '28px' }} defaultValue="30">
              <option value="7">{t('ui.last_7_days', `Last 7 days`)}</option>
              <option value="30">{t('ui.last_30_days', `Last 30 days`)}</option>
              <option value="90">{t('ui.last_90_days', `Last 90 days`)}</option>
            </select>
          </div>
          <div className="panel-body">
            {trend.length === 0 ? (
              <div className="empty-state">{t('ui.no_trend_data_available', `No trend data available`)}</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} minTickGap={20} tickFormatter={(val) => val.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: 'var(--shadow-sm)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                  <Area type="monotone" dataKey="submissions" stroke="var(--brand-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Responses Table */}
        <div className="col-span-12 panel">
          <div className="panel-header">
            <h3 className="panel-title">{t('ui.recent_responses', `Recent Responses`)}</h3>
            <Link to={`/workspace/forms/${formId}/responses`} className="btn btn-ghost btn-sm">{t('ui.view_all', `View All`)}</Link>
          </div>
          <div className="panel-body p-0">
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.id', `ID`)}</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.submitted_at', `Submitted At`)}</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.time_spent', `Time Spent`)}</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.actions', `Actions`)}</th>
                </tr>
              </thead>
              <tbody>
                {(data.latest_submissions || []).map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>#{r.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{relativeTime(r.submitted_at)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{fmt(r.completion_time_seconds)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>
                      <Link to={`/workspace/forms/${formId}/responses/${r.id}`} className="text-brand hover-underline">{t('ui.view', `View`)}</Link>
                    </td>
                  </tr>
                ))}
                {(!data.latest_submissions || data.latest_submissions.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('ui.no_recent_responses', `No recent responses`)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {chartable.length > 0 && (
          <div className="col-span-12">
            <h3 className="text-h3 mt-4 mb-4">{t('ui.field_breakdowns', `Field Breakdowns`)}</h3>
            <div className="grid-12">
              {chartable.map(stat => (
                <div className="col-span-4 panel" key={stat.field_id}>
                  <div className="panel-header">
                    <h3 className="panel-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</h3>
                  </div>
                  <div className="panel-body flex items-center justify-center">
                    <FieldChart stat={stat} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
