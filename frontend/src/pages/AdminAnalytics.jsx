import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Download, BarChart3, Users, ChevronRight, FileText
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, 
  Tooltip, XAxis, YAxis, LineChart, Line
} from "recharts";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const printRef = useRef();

  useEffect(() => {
    API.get("/dashboard/admin")
      .then(r => setData(r.data))
      .catch(e => toast.error(apiMessage(e, "Unable to load analytics")))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleExportCSV = () => {
    if (!data) return;
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Form Title,Responses\n" + 
      data.responses_by_form.map(e => `${e.name},${e.value}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "admin_analytics_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Export successful!");
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div className="btn-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 32 }} ref={printRef}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{t('ui.platform_analytics', `Platform Analytics`)}</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 15 }}>{t('ui.comprehensive_statistics_across_all_form', `Comprehensive statistics across all forms and users.`)}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />{t('ui.export_csv', `Export CSV`)}</button>
          <button className="btn btn-primary" onClick={handleExportPDF}>
            <Download size={16} />{t('ui.export_pdf', `Export PDF`)}</button>
        </div>
      </div>

      <div className="grid-12" style={{ gap: 24 }}>
        
        {/* Submission Trend */}
        <div className="col-span-8">
          <Card style={{ height: '100%', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader title={t('ui.submission_trend', `Submission Trend`)} subtitle="Daily response volume (30 days)" icon={Activity} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.submission_trend} margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                    <Line type="monotone" dataKey="responses" stroke="var(--brand-500)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Forms vs Responses */}
        <div className="col-span-4">
          <Card style={{ height: '100%', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader title={t('ui.forms_vs_responses', `Forms vs Responses`)} subtitle="Distribution across active forms" icon={BarChart3} />
            <CardBody style={{ padding: '0 24px 24px' }}>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.responses_by_form.slice(0, 5)} layout="vertical" margin={{ top: 20, right: 20, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.substring(0, 10)} />
                    <Tooltip cursor={{ fill: 'var(--gray-50)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                    <Bar dataKey="value" barSize={20} fill="var(--info-500)" radius={[0, 4, 4, 0]} name="Responses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid-12" style={{ gap: 24 }}>
        
        {/* Top Performing Forms */}
        <div className="col-span-6">
          <Card style={{ height: '100%', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader title={t('ui.top_performing_forms', `Top Performing Forms`)} subtitle="Highest response volumes" icon={FileText} />
            <CardBody noPadding>
              <Table>
                <TableHeader headers={["Form Title", "Total Responses", "Published Date"]} />
                <TableBody>
                  {data.latest_published_forms.slice(0, 5).map(f => (
                    <TableRow key={f.id}>
                      <TableCell><strong style={{ color: 'var(--text-primary)' }}>{f.title}</strong></TableCell>
                      <TableCell>
                        <span style={{ fontWeight: 600, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px 8px', borderRadius: 999 }}>{compact.format(f.responses)}</span>
                      </TableCell>
                      <TableCell className="text-small">{new Date(f.published_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {/* Most Active Users */}
        <div className="col-span-6">
          <Card style={{ height: '100%', boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader title={t('ui.most_active_users', `Most Active Users`)} subtitle="Top creators by submission volume" icon={Users} />
            <CardBody noPadding>
              <Table>
                <TableHeader headers={["User", "Forms Created", "Total Responses"]} />
                <TableBody>
                  {data.top_creators.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{u.name}</strong>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{u.forms_count}</TableCell>
                      <TableCell>
                        <span style={{ fontWeight: 600, color: 'var(--success-600)', background: 'var(--success-50)', padding: '2px 8px', borderRadius: 999 }}>{compact.format(u.responses_count)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      </div>

    </div>
  );
}
