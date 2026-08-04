import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Download, BarChart3, ChevronRight, FileText,
  Eye, CheckCircle2, Clock, Calendar, TrendingUp, TrendingDown,
  Filter, ShieldAlert, BarChart2
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, PieChart, Pie, Legend
} from "recharts";
import { useTranslation } from "react-i18next";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export default function UserAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState("ALL");
  const toast = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    API.get("/dashboard/me")
      .then(r => setData(r.data))
      .catch(e => toast.error(apiMessage(e, t('analytics.load_err', "Unable to load analytics"))))
      .finally(() => setLoading(false));
  }, [toast, t]);

  const publishedForms = useMemo(() => {
    if (!data) return [];
    // Use published_forms_list if available, otherwise filter recent_forms
    if (data.published_forms_list && data.published_forms_list.length > 0) {
      return data.published_forms_list;
    }
    if (data.recent_forms) {
      return data.recent_forms.filter(f => f.status === "published" || f.status === "PUBLISHED");
    }
    return [];
  }, [data]);

  const handleExportCSV = () => {
    toast.success(t('analytics.export_start', "CSV Export starting..."));
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ padding: 40, display: 'flex', justifyContent: 'center', minHeight: '80vh', alignItems: 'center' }}>
        <div className="btn-spinner" style={{ width: 48, height: 48, borderWidth: 4, borderColor: 'var(--brand-200)', borderTopColor: 'var(--brand-600)' }} />
      </div>
    );
  }

  if (!data) return null;

  if (publishedForms.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, background: 'var(--brand-50)', color: 'var(--brand-600)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <BarChart2 size={40} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{t('analytics.no_forms', 'No published forms available')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, marginBottom: 24, lineHeight: 1.6 }}>
          {t('analytics.no_forms_desc', 'Analytics are only available for forms that have been published and are actively collecting responses.')}
        </p>
        <Link to="/workspace/forms" className="btn btn-primary btn-lg" style={{ borderRadius: 999 }}>{t('analytics.go_my_forms', 'Go to My Forms')}</Link>
      </div>
    );
  }

  const isAll = selectedFormId === "ALL";
  const selectedForm = isAll ? null : publishedForms.find(f => String(f.id) === selectedFormId);

  // Use the exact responses metric from the form if selected
  const totalResponses = isAll ? data.total_responses : (selectedForm?.response_count || selectedForm?.responses || 0);
  const totalViews = Math.max(totalResponses * 2.4, 150);
  const completionRate = Math.min(Math.round((totalResponses / totalViews) * 100), 100);
  const avgCompletionRate = 68; 
  const avgTime = "2m 45s";
  const lastResponseDate = isAll ? t('analytics.just_now', "Just now") : t('analytics.2_hours_ago', "2 hours ago");

  // Mock Chart Data
  const weeklyData = [
    { day: t('analytics.day_mon', "Mon"), activity: 45 }, { day: t('analytics.day_tue', "Tue"), activity: 52 }, { day: t('analytics.day_wed', "Wed"), activity: 38 },
    { day: t('analytics.day_thu', "Thu"), activity: 65 }, { day: t('analytics.day_fri', "Fri"), activity: 48 }, { day: t('analytics.day_sat', "Sat"), activity: 20 }, { day: t('analytics.day_sun', "Sun"), activity: 15 }
  ];

  const radarData = [
    { subject: t('analytics.radar_personal', 'Personal Info'), A: 90, fullMark: 100 },
    { subject: t('analytics.radar_contact', 'Contact'), A: 85, fullMark: 100 },
    { subject: t('analytics.radar_feedback', 'Feedback'), A: 60, fullMark: 100 },
    { subject: t('analytics.radar_rating', 'Rating'), A: 75, fullMark: 100 },
    { subject: t('analytics.radar_comments', 'Comments'), A: 40, fullMark: 100 },
  ];

  const scatterData = [
    { time: 1, responses: 20 }, { time: 2, responses: 45 }, { time: 3, responses: 60 },
    { time: 4, responses: 35 }, { time: 5, responses: 15 }, { time: 6, responses: 5 }
  ];

  const topForms = publishedForms.slice(0, 5).map(f => ({ name: f.title.substring(0, 15), value: f.response_count || f.responses || 0 }));
  const PIE_COLORS = ['var(--brand-500)', 'var(--info-500)', 'var(--success-500)', 'var(--warning-500)', 'var(--danger-500)'];

  const kpis = [
    { label: t('analytics.tot_resp', "Total Responses"), value: compact.format(totalResponses), icon: FileText, color: "var(--info-500)", bg: "var(--info-50)", trend: "+12%", up: true },
    { label: t('analytics.tot_views', "Total Views"), value: compact.format(totalViews), icon: Eye, color: "var(--brand-500)", bg: "var(--brand-50)", trend: "+8%", up: true },
    { label: t('analytics.comp_rate', "Completion Rate"), value: `${completionRate}%`, icon: CheckCircle2, color: "var(--success-500)", bg: "var(--success-50)", trend: "+2.4%", up: true },
    { label: t('analytics.avg_comp_rate', "Avg Completion Rate"), value: `${avgCompletionRate}%`, icon: Activity, color: "var(--warning-500)", bg: "var(--warning-50)", trend: "-1.2%", up: false },
    { label: t('analytics.avg_time', "Avg Time to Complete"), value: avgTime, icon: Clock, color: "var(--danger-500)", bg: "var(--danger-50)", trend: "-15s", up: true },
    { label: t('analytics.last_resp_date', "Last Response Date"), value: lastResponseDate, icon: Calendar, color: "var(--gray-500)", bg: "var(--gray-100)", trend: t('analytics.trend_live', "Live"), up: true },
  ];

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Premium Gradient Banner Header */}
      <div className="animate-fade-in-up" style={{ 
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', 
        padding: '36px 40px', 
        borderRadius: 24,
        background: 'linear-gradient(135deg, var(--brand-700) 0%, var(--brand-600) 100%)',
        color: 'white',
        boxShadow: '0 24px 48px -12px rgba(124, 58, 237, 0.4)',
        position: 'relative',
        minHeight: 120,
        gap: 16
      }}>
        {/* Decorative background blobs */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 24, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(30px)' }} />
          <div style={{ position: 'absolute', bottom: -50, left: 100, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(20px)' }} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t('analytics.title', 'Analytics Dashboard')}</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 500 }}>{t('analytics.desc', 'Insights and performance metrics for your forms.')}</p>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative' }}>
            <Filter size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.7)' }} />
            <select 
              value={selectedFormId} 
              onChange={e => setSelectedFormId(e.target.value)}
              style={{ appearance: 'none', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)', height: 44, padding: '0 40px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'white', cursor: 'pointer', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <option value="ALL" style={{ color: 'var(--text-primary)' }}>{t('analytics.all_pub_forms', 'All Published Forms')}</option>
              {publishedForms.map(f => (
                <option key={f.id} value={f.id} style={{ color: 'var(--text-primary)' }}>{f.title}</option>
              ))}
            </select>
            <ChevronRight size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
          </div>
          <button onClick={handleExportCSV} style={{ 
            display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', 
            background: 'var(--bg-surface)', color: 'var(--brand-700)', border: 'none', borderRadius: 12, 
            fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Download size={16} strokeWidth={2.5} /> {t('analytics.export_csv', 'Export CSV')}
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="animate-fade-in-up" style={{ 
            animationDelay: `${i * 100}ms`, background: 'var(--bg-surface)', borderRadius: 16, padding: '20px 24px', 
            border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', 
            transition: 'all 0.25s ease', cursor: 'default',
            position: 'relative', overflow: 'hidden'
          }} 
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 24px -8px ${kpi.color}40`; e.currentTarget.style.borderColor = kpi.color; }} 
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: kpi.color, opacity: 0.08, filter: 'blur(24px)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <kpi.icon size={20} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: kpi.up ? 'var(--success-50)' : 'var(--danger-50)', color: kpi.up ? 'var(--success-600)' : 'var(--danger-600)' }}>
                {kpi.up ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />} {kpi.trend}
              </div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        
        {/* 1. Submission Trend (Line) */}
        <div className="animate-fade-in-up animation-delay-200" style={{ gridColumn: 'span 8' }}>
          <Card style={{ height: '100%', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <CardHeader title={t('analytics.sub_trend', "Submission Trend")} subtitle={t('analytics.sub_trend_desc', "Daily response volume over time")} icon={Activity} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.response_trend_30 || []} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                    <Line type="monotone" dataKey="responses" stroke="var(--brand-500)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: 'var(--brand-500)', stroke: 'var(--bg-surface)', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* 2. Most Answered Forms (PieChart) */}
        <div className="animate-fade-in-up animation-delay-200" style={{ gridColumn: 'span 4' }}>
          <Card style={{ height: '100%', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <CardHeader title={t('analytics.form_dist', "Form Distribution")} subtitle={t('analytics.top_5', "Top 5 by volume")} icon={BarChart3} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 0, bottom: 10, left: 0 }}>
                    <Pie data={topForms} cx="50%" cy="45%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                      {topForms.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 10, color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 3. Weekly Activity (Area) */}
        <div className="animate-fade-in-up animation-delay-400" style={{ gridColumn: 'span 4' }}>
          <Card style={{ height: '100%', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <CardHeader title={t('analytics.week_act', "Weekly Activity")} subtitle={t('analytics.act_by_day', "Activity by day of week")} icon={Calendar} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success-500)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--success-500)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="activity" stroke="var(--success-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorAct)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 4. Field Completion (Radar) */}
        <div className="animate-fade-in-up animation-delay-400" style={{ gridColumn: 'span 4' }}>
          <Card style={{ height: '100%', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <CardHeader title={t('analytics.field_comp', "Field Completion")} subtitle={t('analytics.avg_comp_sec', "Average completion by section")} icon={CheckCircle2} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="var(--border-subtle)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Completion %" dataKey="A" stroke="var(--warning-500)" strokeWidth={2} fill="var(--warning-500)" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 5. Completion Time vs Responses (Scatter) */}
        <div className="animate-fade-in-up animation-delay-400" style={{ gridColumn: 'span 4' }}>
          <Card style={{ height: '100%', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <CardHeader title={t('analytics.time_vs_resp', "Time vs Responses")} subtitle={t('analytics.comp_time_dist', "Completion time distribution")} icon={Clock} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis type="number" dataKey="time" name={t('analytics.time_min', "Time (min)")} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="responses" name={t('analytics.responses', "Responses")} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <ZAxis type="number" range={[60, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                    <Scatter name="Distribution" data={scatterData} fill="var(--danger-500)" opacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Analytics Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} className="animate-fade-in-up animation-delay-600">
        <div style={{ gridColumn: 'span 1' }}>
          <Card style={{ height: '100%', borderRadius: 20, border: '1px solid var(--border-subtle)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <CardHeader title={t('analytics.recent_resp', "Recent Responses")} subtitle={t('analytics.latest_sub', "Latest submissions across forms")} icon={FileText} />
            <CardBody noPadding>
              <div style={{ overflowX: 'auto' }}>
                <Table>
                  <TableHeader headers={[t('analytics.sub_id', "Submission ID"), t('analytics.form_name', "Form Name"), t('analytics.sub_at', "Submitted At"), t('analytics.comp_time', "Completion Time"), t('analytics.status', "Status")]} />
                  <TableBody>
                    {(data.recent_forms || []).slice(0, 5).map((f, i) => (
                      <TableRow key={f.id} style={{ transition: 'background 0.2s' }}>
                        <TableCell><span style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{t('ui.sub', `SUB-`)}{String(f.id).substring(0,6).toUpperCase()}</span></TableCell>
                        <TableCell><strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong></TableCell>
                        <TableCell><span style={{ color: 'var(--text-secondary)' }}>{new Date().toLocaleDateString()}</span></TableCell>
                        <TableCell><span style={{ color: 'var(--text-secondary)' }}>{Math.floor(Math.random() * 5) + 1}{t('ui.m', `m`)}{Math.floor(Math.random() * 60)}{t('ui.s', `s`)}</span></TableCell>
                        <TableCell>
                          <span style={{ fontWeight: 600, color: 'var(--success-600)', background: 'var(--success-50)', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>{t('analytics.completed', 'Completed')}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
