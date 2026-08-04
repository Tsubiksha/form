import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { Download, FileText, CheckCircle2, Clock, AlertCircle, FileJson, Table2, FileSpreadsheet } from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { relativeTime } from "../utils/relativeTime";

const FORMAT_OPTIONS = [
  { format: "csv",   label: "CSV",   icon: Table2,         color: "#16a34a", desc: "Excel & spreadsheets" },
  { format: "json",  label: "JSON",  icon: FileJson,       color: "#d97706", desc: "Raw structured data" },
];

export default function ExportCenter() {
  const { t } = useTranslation();
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [exporting, setExporting] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [formsRes, historyRes] = await Promise.all([
        API.get("/forms/", { params: { page: 1, page_size: 100 } }),
        API.get("/forms/exports/history").catch(() => ({ data: [] }))
      ]);
      const formsData = formsRes.data.items || formsRes.data;
      setForms(formsData);
      setHistory(historyRes.data || []);
      if (formsData?.length > 0) setSelectedFormId(formsData[0].id);
    } catch (error) {
      toast.error(apiMessage(error, "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load versions whenever selected form changes
  useEffect(() => {
    if (!selectedFormId) {
      setVersions([]);
      setSelectedVersionId("");
      return;
    }
    API.get(`/forms/${selectedFormId}/versions`)
      .then(r => {
        const vList = r.data || [];
        setVersions(vList);
        setSelectedVersionId("");
      })
      .catch(() => setVersions([]));
  }, [selectedFormId]);

  const triggerExport = async (format) => {
    if (!selectedFormId) return toast.error("Please select a form first.");
    setExporting(format);
    const form = forms.find(f => String(f.id) === String(selectedFormId));
    const verTag = selectedVersionId ? ` (v${versions.find(v => String(v.id) === String(selectedVersionId))?.version_number || selectedVersionId})` : "";
    const newExport = { id: Date.now(), form_title: `${form?.title || "Form"}${verTag}`, format, status: "processing", date: new Date().toISOString() };
    setHistory(prev => [newExport, ...prev]);
    try {
      const params = { format };
      if (selectedVersionId) params.version_id = selectedVersionId;
      const { data: blob } = await API.get(`/forms/${selectedFormId}/export`, { params, responseType: "blob" });
      const ext = { json: "json", csv: "csv", excel: "xlsx", pdf: "pdf" }[format] || "csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `form-${selectedFormId}${selectedVersionId ? '-v' + selectedVersionId : ''}-export.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setHistory(prev => prev.map(item => item.id === newExport.id ? { ...item, status: "completed" } : item));
      toast.success(`${format.toUpperCase()} export completed`);
    } catch (error) {
      setHistory(prev => prev.map(item => item.id === newExport.id ? { ...item, status: "failed" } : item));
      toast.error(apiMessage(error, "Export failed."));
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="exports-page">
      {/* Header */}
      <div>
        <h1 className="text-h1">{t('ui.export_center', `Export Center`)}</h1>
        <p className="text-body">{t('ui.download_version_wise_form_responses_as', `Download version-wise form responses as CSV or JSON.`)}</p>
      </div>

      <div className="grid-12">
        {/* Left: New Export Panel */}
        <div className="col-span-4 panel">
          <div className="panel-header">
            <span className="panel-title">{t('ui.new_export', `New Export`)}</span>
          </div>
          <div className="panel-body flex-col gap-4">
            {/* Form Select */}
            <div className="field-group">
              <label className="field-label">{t('ui.select_form', `Select Form`)}</label>
              {loading ? (
                <div className="skeleton" style={{ height: 36, borderRadius: 6 }} />
              ) : (
                <select className="input" value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)}>
                  {forms.length === 0
                    ? <option value="">{t('ui.no_forms_available', `No forms available`)}</option>
                    : forms.map(f => (
                      <option value={f.id} key={f.id}>
                        {f.title} ({f.response_count || 0}{t('ui.responses', `responses)`)}</option>
                    ))
                  }
                </select>
              )}
            </div>

            {/* Version Select */}
            {versions.length > 0 && (
              <div className="field-group">
                <label className="field-label">{t('ui.select_version', `Select Version`)}</label>
                <select className="input" value={selectedVersionId} onChange={e => setSelectedVersionId(e.target.value)}>
                  <option value="">{t('ui.all_versions', `All Versions`)}</option>
                  {versions.map(v => (
                    <option value={v.id} key={v.id}>{t('ui.version', `Version`)}{v.version_number} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Format Buttons */}
            <div>
              <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>{t('ui.format', `Format`)}</label>
              <div className="export-format-grid">
                {FORMAT_OPTIONS.map(({ format, label, icon: Icon, color, desc }) => (
                  <button
                    key={format}
                    className="export-format-btn"
                    onClick={() => triggerExport(format)}
                    disabled={!!exporting || !selectedFormId}
                  >
                    <div style={{ width: 36, height: 36, background: `${color}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 4 }}>
                      <Icon size={18} />
                    </div>
                    <strong>{label}</strong>
                    <span>{desc}</span>
                    {exporting === format && <span style={{ fontSize: 11, color: '#7c3aed' }}>{t('ui.exporting', `Exporting…`)}</span>}
                  </button>
                ))}
              </div>
            </div>

            {exporting && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#7c3aed', padding: '8px 12px', background: '#f5f3ff', borderRadius: 6 }}>
                <span className="btn-spinner" style={{ borderTopColor: '#7c3aed', borderColor: 'rgba(124,58,237,0.2)' }} />{t('ui.generating', `Generating`)}{exporting.toUpperCase()}{t('ui.export', `export…`)}</div>
            )}
          </div>
        </div>

        {/* Right: History */}
        <div className="col-span-8 panel">
          <div className="panel-header">
            <span className="panel-title">{t('ui.export_history', `Export History`)}</span>
            <span className="text-small">{history.length}{t('ui.exports', `exports`)}</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('ui.form', `Form`)}</th>
                  <th>{t('ui.format', `Format`)}</th>
                  <th>{t('ui.date', `Date`)}</th>
                  <th>{t('ui.status', `Status`)}</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <div className="empty-state" style={{ padding: '40px 16px' }}>
                        <Download size={32} />
                        <h3>{t('ui.no_exports_yet', `No exports yet`)}</h3>
                        <p>{t('ui.select_a_form_and_export_format_to_get_s', `Select a form and export format to get started.`)}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.form_title}</strong></td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', background: '#f1f5f9', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          {item.format}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{relativeTime(item.date)}</td>
                      <td>
                        {item.status === "completed" && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#dcfce7', color: '#16a34a', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                            <CheckCircle2 size={11} />{t('ui.completed', `Completed`)}</span>
                        )}
                        {item.status === "processing" && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                            <Clock size={11} />{t('ui.processing', `Processing`)}</span>
                        )}
                        {item.status === "failed" && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#fef2f2', color: '#dc2626', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                            <AlertCircle size={11} />{t('ui.failed', `Failed`)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
