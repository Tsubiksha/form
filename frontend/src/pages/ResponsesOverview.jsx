import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, FileSpreadsheet, FileText, Inbox, Search, Filter, Sparkles, ArrowRight, Clock, Layers, FileDown, CheckCircle2 } from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { relativeTime } from "../utils/relativeTime";

const normalizedStatus = form => String(form.status || "").toLowerCase();
const responseCount = form => Number(form.response_count || 0);
const timestamp = value => value ? new Date(value).getTime() : null;
const latestSubmission = form => form.latest_submission_at || form.latest_submission;
const publishedAt = form => form.published_at || form.updated_at;

const compareDatesDescending = (a, b, nullsLast = true) => {
  const left = timestamp(a), right = timestamp(b);
  if (left === null && right === null) return 0;
  if (left === null) return nullsLast ? 1 : -1;
  if (right === null) return nullsLast ? -1 : 1;
  return right - left;
};

const compareDatesAscending = (a, b, nullsLast = true) => {
  const left = timestamp(a), right = timestamp(b);
  if (left === null && right === null) return 0;
  if (left === null) return nullsLast ? 1 : -1;
  if (right === null) return nullsLast ? -1 : 1;
  return left - right;
};

export default function ResponsesOverview() {
  const { t } = useTranslation();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("most-responses");
  const toast = useToast();

  useEffect(() => {
    API.get("/forms/", { params: { page: 1, page_size: 100 } })
      .then(response => setForms(response.data.items || response.data))
      .catch(error => toast.error(apiMessage(error, "Unable to load forms")))
      .finally(() => setLoading(false));
  }, [toast]);

  const responseForms = useMemo(() => forms.filter(form => normalizedStatus(form) === "published" || responseCount(form) > 0), [forms]);

  const visible = useMemo(() => responseForms
    .filter(form => {
      const currentStatus = normalizedStatus(form);
      if (status === "published" && currentStatus !== "published") return false;
      if (status === "archived" && (currentStatus !== "archived" || responseCount(form) <= 0)) return false;
      return String(form.title || "").toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      switch (sort) {
        case "fewest-responses": return responseCount(a) - responseCount(b) || String(a.title || "").localeCompare(String(b.title || ""));
        case "recently-submitted": return compareDatesDescending(latestSubmission(a), latestSubmission(b), true);
        case "oldest-submission": return compareDatesAscending(latestSubmission(a), latestSubmission(b), true);
        case "name-asc": return String(a.title || "").localeCompare(String(b.title || ""));
        case "name-desc": return String(b.title || "").localeCompare(String(a.title || ""));
        case "recently-published": return compareDatesDescending(publishedAt(a), publishedAt(b), true);
        case "oldest-published": return compareDatesAscending(publishedAt(a), publishedAt(b), true);
        case "most-responses":
        default: return responseCount(b) - responseCount(a) || compareDatesDescending(latestSubmission(a), latestSubmission(b), true);
      }
    }), [responseForms, search, status, sort]);

  const total = responseForms.reduce((sum, form) => sum + responseCount(form), 0);
  const latest = responseForms.filter(form => latestSubmission(form)).sort((a, b) => compareDatesDescending(latestSubmission(a), latestSubmission(b), true))[0];

  const download = async (form, type) => {
    if (responseCount(form) <= 0) return toast.error("No responses available to export yet.");
    const key = `${form.id}-${type}`;
    setExporting(key);
    try {
      const { data } = await API.get(`/forms/${form.id}/responses/export/${type}`, { responseType: "blob" });
      const ext = { csv: "csv", excel: "xlsx", pdf: "pdf" }[type];
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${form.title}-responses.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${type === "excel" ? "Excel" : type.toUpperCase()} exported`);
    } catch (error) { toast.error(apiMessage(error, "Export failed")); }
    finally { setExporting(""); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      
      {/* Dark Hero Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        color: 'white',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.12)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
              <Sparkles size={14} style={{ color: '#a78bfa' }} />{t('ui.responses_directory_exports', `Responses Directory & Exports`)}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>{t('ui.form_responses', `Form Responses`)}</h1>
            <p style={{ fontSize: 13.5, color: '#cbd5e1', margin: 0 }}>{t('ui.review_submission_activity_filter_form_m', `Review submission activity, filter form metrics, and export dataset records across active forms.`)}</p>
          </div>
        </div>
      </div>

      {/* Vibrant Single-Row KPI Cards Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          
          {/* Total Responses */}
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--brand-50) 100%)',
            border: '1px solid var(--brand-200)',
            borderTop: '4px solid var(--brand-600)',
            borderRadius: 14,
            padding: '20px 22px',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Inbox size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{total}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{t('ui.total_responses', `Total Responses`)}</div>
            </div>
          </div>

          {/* Forms with Responses */}
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--success-50) 100%)',
            border: '1px solid var(--success-200)',
            borderTop: '4px solid var(--success-600)',
            borderRadius: 14,
            padding: '20px 22px',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--success-100)', color: 'var(--success-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BarChart3 size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {responseForms.filter(f => responseCount(f) > 0).length}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{t('ui.forms_with_responses', `Forms with Responses`)}</div>
            </div>
          </div>

          {/* Total Forms */}
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--info-50) 100%)',
            border: '1px solid var(--info-200)',
            borderTop: '4px solid var(--info-600)',
            borderRadius: 14,
            padding: '20px 22px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--info-100)', color: 'var(--info-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{responseForms.length}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{t('ui.total_forms', `Total Forms`)}</div>
            </div>
          </div>

          {/* Latest Activity */}
          <div style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--warning-50) 100%)',
            border: '1px solid var(--warning-200)',
            borderTop: '4px solid var(--warning-600)',
            borderRadius: 14,
            padding: '20px 22px',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--warning-100)', color: 'var(--warning-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {latest ? relativeTime(latestSubmission(latest)) : "—"}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{t('ui.latest_activity', `Latest Activity`)}</div>
            </div>
          </div>

        </div>
      )}

      {/* Filter & Control Bar */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-subtle)', padding: '14px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 38, height: 40, borderRadius: 8, fontSize: 13 }}
              placeholder={t('ui.search_forms_by_title', `Search forms by title…`)}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="input" style={{ width: 150, height: 40, borderRadius: 8, fontSize: 13 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{t('ui.all_statuses', `All Statuses`)}</option>
            <option value="published">{t('ui.published', `Published`)}</option>
            <option value="archived">{t('ui.archived', `Archived`)}</option>
          </select>

          <select className="input" style={{ width: 190, height: 40, borderRadius: 8, fontSize: 13 }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="most-responses">{t('ui.most_responses', `Most responses`)}</option>
            <option value="fewest-responses">{t('ui.fewest_responses', `Fewest responses`)}</option>
            <option value="recently-submitted">{t('ui.recently_submitted', `Recently submitted`)}</option>
            <option value="name-asc">{t('ui.name_a_z', `Name: A–Z`)}</option>
            <option value="name-desc">{t('ui.name_z_a', `Name: Z–A`)}</option>
          </select>

          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', padding: '6px 12px', borderRadius: 999 }}>
            {visible.length} {visible.length === 1 ? "form" : "forms"}
          </span>
        </div>
      </div>

      {/* Form Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map(i => <div key={i} className="panel skeleton-card" style={{ height: 220, borderRadius: 16 }} />)}
        </div>
      ) : visible.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {visible.map(form => {
            const count = responseCount(form);
            const hasResponses = count > 0;
            const st = normalizedStatus(form);
            return (
              <div
                key={form.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 16,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                className="resp-overview-card"
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BarChart3 size={18} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {form.title}
                    </h3>
                  </div>

                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: st === "published" ? 'var(--success-50)' : 'var(--warning-50)',
                    color: st === "published" ? 'var(--success-700)' : 'var(--warning-700)'
                  }}>
                    {form.status || "draft"}
                  </span>
                </div>

                {/* Metrics */}
                <div style={{ background: 'var(--bg-surface-2)', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{count}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>{t('ui.responses_collected', `responses collected`)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {latestSubmission(form) ? relativeTime(latestSubmission(form)) : "No responses"}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{t('ui.latest_activity', `latest activity`)}</div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <Link
                  to={`/workspace/forms/${form.id}/responses`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 42,
                    background: 'var(--brand-600)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 13.5,
                    borderRadius: 10,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{t('ui.view_responses', `View Responses`)}</span>
                  <ArrowRight size={15} />
                </Link>

                {/* Quick Exports Bar */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, height: 32, fontSize: 12, borderRadius: 6 }}
                    onClick={() => download(form, "csv")}
                    disabled={!!exporting || !hasResponses}
                    title={t('ui.export_csv_dataset', `Export CSV dataset`)}
                  >
                    <Download size={13} />{t('ui.csv', `CSV`)}</button>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, height: 32, fontSize: 12, borderRadius: 6 }}
                    onClick={() => download(form, "excel")}
                    disabled={!!exporting || !hasResponses}
                    title={t('ui.export_excel_spreadsheet', `Export Excel spreadsheet`)}
                  >
                    <Download size={13} />{t('ui.excel', `Excel`)}</button>
                  <button
                    className="btn btn-ghost"
                    style={{ flex: 1, height: 32, fontSize: 12, borderRadius: 6 }}
                    onClick={() => download(form, "pdf")}
                    disabled={!!exporting || !hasResponses}
                    title={t('ui.export_pdf_document', `Export PDF document`)}
                  >
                    <Download size={13} />{t('ui.pdf', `PDF`)}</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Inbox size={44} style={{ color: 'var(--text-tertiary)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{search ? "No forms match your search." : "No response forms found"}</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>{search ? "Try a different search term." : "Published forms with responses will appear here."}</p>
          <Link className="btn btn-primary" to="/workspace/forms" style={{ marginTop: 8 }}>{t('ui.go_to_forms', `Go to Forms`)}</Link>
        </div>
      )}
    </div>
  );
}

