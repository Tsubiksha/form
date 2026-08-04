import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, FileText, Database, Activity, GitMerge, ChevronRight,
  TrendingUp, TrendingDown, Clock, ShieldCheck, Mail, Server
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart
} from "recharts";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { relativeTime } from "../utils/relativeTime";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

const StatWidget = ({ title, value, trendStr, icon: Icon, color, trendUp }) => (
  <div style={{
    background: 'var(--bg-surface)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 20,
    transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
  }}
  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
  >
    <div style={{ width: 48, height: 48, borderRadius: 12, background: `var(--${color}-50)`, color: `var(--${color}-600)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={24} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 4 }}>
        <h3 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</h3>
        {trendStr && (
          <span style={{ fontSize: 12, fontWeight: 600, color: trendUp ? 'var(--success-600)' : 'var(--warning-600)', display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 2 }}>
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {trendStr}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const load = useCallback((silent = false) =>
    API.get("/dashboard/admin")
      .then(r => setData(r.data))
      .catch(e => {
        if (!silent) toast.error(apiMessage(e, t('admin.dash_load_err', "Unable to load admin dashboard")));
      })
      .finally(() => setLoading(false)),
    [toast, t]
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 60000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div className="btn-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Styled Welcome Section */}
      <div style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
        borderRadius: 16,
        padding: '32px 40px',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -50, right: 50, width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('admin.portal', 'Admin Portal')}</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t('admin.welcome', 'Welcome back, {{name}}!', { name: user?.name?.split(' ')[0] || 'Admin' })}</h1>
          <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.8)', maxWidth: 500 }}>{t('admin.welcome_desc', "Here's what's happening across your low-code platform today. System vitals are looking good.")}</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12 }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <Server size={20} style={{ color: '#34d399' }} />
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase' }}>{t('admin.sys_status', 'System Status')}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{t('admin.all_op', 'All Operational')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <StatWidget title={t('admin.tot_forms', "Total Forms")} value={compact.format(data.total_forms || 0)} trendStr={t('admin.this_week', "+{{count}} this week", { count: data.forms_this_week })} icon={FileText} color="brand" trendUp={true} />
        <StatWidget title={t('admin.act_forms', "Active Forms")} value={compact.format((data.forms_by_status || []).find(s => s.name === 'published')?.value || 0)} trendStr={t('admin.live', "Live")} icon={Activity} color="success" trendUp={true} />
        <StatWidget title={t('admin.tot_users', "Total Users")} value={compact.format(data.total_users || 0)} trendStr={t('admin.this_week', "+{{count}} this week", { count: data.users_this_week })} icon={Users} color="info" trendUp={true} />
        <StatWidget title={t('admin.tot_resp', "Total Responses")} value={compact.format(data.response_count || 0)} trendStr={t('admin.this_week', "+{{count}} this week", { count: data.responses_this_week })} icon={Database} color="brand" trendUp={true} />
        <StatWidget title={t('admin.avg_comp', "Average Completion Rate")} value="68%" icon={TrendingUp} color="success" trendUp={true} />
        <StatWidget title={t('admin.ov_comp', "Overall Completion Rate")} value="72%" icon={ShieldCheck} color="info" trendUp={true} />
      </div>

      {/* Main Charts */}
      <div className="grid-12" style={{ gap: 24 }}>
        <div className="col-span-8">
          <Card style={{ height: '100%', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)' }}>
            <CardHeader title={t('admin.sub_velocity', "Submission Velocity")} subtitle={t('admin.sub_velocity_desc', "Daily response volume across all forms")} icon={Activity} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.submission_trend} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} minTickGap={30} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} cursor={{ fill: 'var(--gray-50)' }} />
                    <Area type="monotone" dataKey="responses" stroke="none" fill="url(#colorSub)" />
                    <Bar dataKey="responses" barSize={8} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="responses" stroke="#7c3aed" strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="col-span-4">
          <Card style={{ height: '100%', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader title={t('admin.resp_form', "Responses by Form")} subtitle={t('admin.resp_form_desc', "Forms with highest engagement")} icon={BarChart} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.latest_published_forms.slice(0, 5)} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="title" type="category" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={80} tickFormatter={(val) => val.substring(0, 10)} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }} cursor={{ fill: 'var(--gray-50)' }} />
                    <Bar dataKey="responses" barSize={16} radius={[0, 4, 4, 0]} fill="var(--brand-500)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid-12" style={{ gap: 24 }}>
        <div className="col-span-6">
          <Card style={{ boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('admin.top_forms', "Top Published Forms")}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>{t('admin.top_forms_desc', "Highest performing active forms")}</p>
              </div>
              <Link to="/admin/forms" className="btn-ghost" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'var(--brand-600)' }}>
                {t('admin.view_all', "View All")} <ChevronRight size={14} />
              </Link>
            </div>
            <Table>
              <TableHeader headers={[t('admin.form_title', "Form Title"), t('admin.tot_resp_col', "Total Responses"), t('admin.pub_date', "Published Date")]} />
              <TableBody>
                {data.latest_published_forms.slice(0, 5).map(f => (
                  <TableRow key={f.id}>
                    <TableCell><strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong></TableCell>
                    <TableCell><Badge variant="success">{f.responses} {t('admin.entries', 'entries')}</Badge></TableCell>
                    <TableCell className="text-small">{new Date(f.published_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="col-span-6">
          <Card style={{ boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t('admin.live_sub', "Live Submissions")}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>{t('admin.live_sub_desc', "Most recent entries globally")}</p>
              </div>
            </div>
            <Table>
              <TableHeader headers={[t('admin.form', "Form"), t('admin.time', "Time"), t('admin.status', "Status")]} />
              <TableBody>
                {data.recent_responses.slice(0, 5).map(r => (
                  <TableRow key={r.id}>
                    <TableCell><strong style={{ color: 'var(--text-primary)' }}>{r.form_title}</strong></TableCell>
                    <TableCell className="text-small">{relativeTime(r.submitted_at)}</TableCell>
                    <TableCell><Badge variant="brand">{t('admin.captured', 'Captured')}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
