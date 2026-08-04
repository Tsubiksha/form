import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight,
  Inbox, Eye, X, Calendar, Clock, Check, ChevronDown, Filter,
  RotateCcw, AlertCircle, Hash, Sparkles, FileText, Layers, Star,
  Database, RefreshCw, ArrowRight, Image as ImageIcon
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { relativeTime, formatDateTime } from "../utils/relativeTime";

// ── File Helpers & Lightbox Modal ────────────────────────────
function isImageFile(val) {
  if (!val) return false;
  const name = val.file_name || val.name || val.stored_name || "";
  const type = val.type || val.mime_type || "";
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
}

async function downloadFileAttachment(val, toast) {
  if (!val || !val.download_url) {
    if (toast) toast.error("File download link unavailable");
    return;
  }
  try {
    const { data } = await API.get(val.download_url, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = val.name || val.file_name || "downloaded-file";
    a.click();
    URL.revokeObjectURL(url);
    if (toast) toast.success("File downloaded");
  } catch (err) {
    if (toast) toast.error(apiMessage(err, "Failed to download file"));
  }
}

function ImagePreviewModal({ imageVal, onClose, onDownload }) {
  const { t } = useTranslation();
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!imageVal) return;
    if (imageVal.download_url) {
      API.get(imageVal.download_url, { responseType: "blob" })
        .then(r => {
          setImgSrc(URL.createObjectURL(r.data));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (imageVal.url) {
      setImgSrc(imageVal.url);
      setLoading(false);
    }
  }, [imageVal]);

  if (!imageVal) return null;
  const filename = imageVal.name || imageVal.file_name || "Image Preview";

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onClick={onClose}
    >
      <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 16,
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            <ImageIcon size={16} style={{ color: 'var(--brand-600)' }} />
            <span>{filename}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onDownload(imageVal)}
            >
              <Download size={14} />{t('ui.download', `Download`)}</button>
            <button
              className="btn-icon btn-ghost"
              onClick={onClose}
              style={{ width: 32, height: 32 }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', background: '#0f172a', minWidth: 340, minHeight: 260 }}>
          {loading ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>{t('ui.loading_preview_image', `Loading preview image…`)}</div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={filename}
              style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />
          ) : (
            <div style={{ color: '#ef4444', fontSize: 13 }}>{t('ui.failed_to_load_image_preview', `Failed to load image preview`)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function getFieldValue(resp, fieldId) {
  if (!resp) return null;
  if (Array.isArray(resp.values)) {
    const found = resp.values.find(v => String(v.field_id) === String(fieldId));
    if (found) return found.value;
  }
  const raw = resp.data || {};
  return raw[String(fieldId)] ?? raw[fieldId] ?? null;
}

function renderCellValue(val, fieldType = "", onPreviewImage = null, onDownloadDoc = null, t = (k, f) => f) {
  if (val === null || val === undefined || val === "") {
    return <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>—</span>;
  }

  if (typeof val === "object" && val !== null) {
    if (val.file_name || val.name || val.stored_name) {
      const isImg = isImageFile(val);
      const filename = val.name || val.file_name || val.stored_name || "Attachment";
      return isImg ? (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPreviewImage && onPreviewImage(val)}
          title={t('ui.click_to_preview_image', `Click to preview image`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            background: 'var(--brand-50)',
            color: 'var(--brand-700)',
            border: '1px solid var(--brand-300)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            maxWidth: 180,
            whiteSpace: 'nowrap'
          }}
        >
          <ImageIcon size={13} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{filename}</span>
          <Eye size={12} style={{ opacity: 0.8 }} />
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDownloadDoc && onDownloadDoc(val)}
          title={t('ui.click_to_download_document', `Click to download document`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            background: 'var(--info-50)',
            color: 'var(--info-700)',
            border: '1px solid var(--info-300)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            maxWidth: 180,
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={13} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{filename}</span>
          <Download size={12} style={{ opacity: 0.8 }} />
        </button>
      );
    }
    if (Array.isArray(val)) {
      return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {val.map((item, idx) => (
            <span key={idx} style={{ padding: '2px 8px', background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', borderRadius: 6, fontSize: 11.5, fontWeight: 600 }}>
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    return String(JSON.stringify(val));
  }

  const strVal = String(val).trim();
  const lowerVal = strVal.toLowerCase();

  // Boolean pills
  if (lowerVal === "yes" || lowerVal === "true") {
    return <span style={{ padding: '2px 10px', background: 'var(--success-50)', color: 'var(--success-700)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{t('ui.yes', `Yes`)}</span>;
  }
  if (lowerVal === "no" || lowerVal === "false") {
    return <span style={{ padding: '2px 10px', background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{t('ui.no', `No`)}</span>;
  }

  // Rating badge
  if (fieldType === "rating" || (!isNaN(strVal) && Number(strVal) >= 1 && Number(strVal) <= 5 && fieldType === "rating")) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: 'var(--warning-50)', color: 'var(--warning-800)', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
        <Star size={11} style={{ fill: 'var(--warning-600)', color: 'var(--warning-600)' }} /> {strVal}
      </span>
    );
  }

  return <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{strVal}</span>;
}

// ── Date-range filter options ────────────────────────────────
const DATE_RANGES = [
  { label: "Any time", value: "" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
];

function inDateRange(submittedAt, range) {
  if (!range || !submittedAt) return true;
  const d = new Date(submittedAt);
  const now = new Date();
  const msPerDay = 86400000;
  switch (range) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d >= start;
    }
    case "7d": return d >= new Date(now - 7 * msPerDay);
    case "30d": return d >= new Date(now - 30 * msPerDay);
    case "90d": return d >= new Date(now - 90 * msPerDay);
    default: return true;
  }
}

// ── Filter Panel Component ────────────────────────────────────
function FilterPanel({ columns, filters, onChange, onReset, onClose, activeCount }) {
  const { t } = useTranslation();
  return (
    <div className="resp-filter-panel" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000, width: 360, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <div className="resp-filter-header">
        <div className="resp-filter-title">
          <Filter size={14} />
          <span>{t('ui.filter_responses', `Filter Responses`)}</span>
          {activeCount > 0 && (
            <span className="resp-filter-badge">{activeCount}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {activeCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onReset}>
              <RotateCcw size={12} />{t('ui.reset', `Reset`)}</button>
          )}
          <button className="btn-icon btn-ghost" onClick={onClose} style={{ width: 28, height: 28 }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="resp-filter-body" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {/* Date range */}
        <div className="resp-filter-group">
          <label className="resp-filter-label">
            <Calendar size={12} />{t('ui.submitted_date', `Submitted Date`)}</label>
          <div className="resp-filter-chips">
            {DATE_RANGES.map(opt => (
              <button
                key={opt.value}
                className={`resp-filter-chip ${filters.dateRange === opt.value ? "active" : ""}`}
                onClick={() => onChange({ ...filters, dateRange: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field value filters */}
        {columns.length > 0 && (
          <div className="resp-filter-group">
            <label className="resp-filter-label">
              <Hash size={12} />{t('ui.field_contains', `Field Contains`)}</label>
            <div className="resp-filter-field-rows">
              {columns.map(col => (
                <div key={col.id} className="resp-filter-field-row">
                  <span className="resp-filter-field-name">{col.label}</span>
                  <input
                    className="input resp-filter-field-input"
                    placeholder={`Filter by ${col.label}…`}
                    value={filters.fieldValues?.[col.id] || ""}
                    onChange={e =>
                      onChange({
                        ...filters,
                        fieldValues: { ...filters.fieldValues, [col.id]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Responses() {
  const { t } = useTranslation();
  const { formId } = useParams();
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState(formId || "");
  const [responses, setResponses] = useState({ items: [], total: 0 });
  const [formFields, setFormFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [exportingFormat, setExportingFormat] = useState("");

  // Lightbox preview state
  const [previewImageVal, setPreviewImageVal] = useState(null);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ dateRange: "", fieldValues: {} });
  const filterRef = useRef(null);

  const toast = useToast();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedVersionId) n++;
    if (filters.dateRange) n++;
    if (filters.fieldValues) {
      n += Object.values(filters.fieldValues).filter(v => v && v.trim()).length;
    }
    return n;
  }, [filters, selectedVersionId]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!showFilter) return;
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilter]);

  // Load all forms for the dropdown
  const loadForms = useCallback(async () => {
    try {
      const { data } = await API.get("/forms/", { params: { page: 1, page_size: 100 } });
      const items = data.items || data;
      setForms(items);
      if (!selectedFormId && items.length > 0) {
        setSelectedFormId(String(items[0].id));
      }
    } catch (error) {
      toast.error(apiMessage(error, "Failed to load forms"));
    }
  }, [selectedFormId, toast]);

  useEffect(() => { loadForms(); }, [loadForms]);

  // Load responses & form schema
  const loadData = useCallback(async () => {
    const id = selectedFormId || formId;
    if (!id) return;
    setLoading(true);
    try {
      const [respRes, versionsRes, formRes] = await Promise.all([
        API.get(`/forms/${id}/responses`, { params: { page, page_size: PAGE_SIZE, search, version_id: selectedVersionId || undefined } }),
        API.get(`/forms/${id}/versions`).catch(() => ({ data: [] })),
        API.get(`/forms/${id}`).catch(() => ({ data: {} })),
      ]);

      setResponses(respRes.data || { items: [], total: 0 });
      
      const formVersions = (versionsRes.data && Array.isArray(versionsRes.data) && versionsRes.data.length > 0)
        ? versionsRes.data
        : (respRes.data?.versions || formRes.data?.versions || []);
      
      setVersions(formVersions);

      // Extract form fields from selected version or published version
      let fields = [];
      if (selectedVersionId) {
        const vMatch = formVersions.find(v => String(v.id) === String(selectedVersionId));
        fields = vMatch?.snapshot?.fields || [];
      }
      if (!fields.length) {
        const snapshot = formVersions.find(v => v.status === "published")?.snapshot;
        fields = snapshot?.fields?.length ? snapshot.fields : formRes.data?.fields || [];
      }
      setFormFields(fields);
    } catch (error) {
      toast.error(apiMessage(error, "Failed to load responses"));
    } finally {
      setLoading(false);
    }
  }, [selectedFormId, formId, page, search, selectedVersionId, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Direct Version-Wise Export
  const downloadExport = async (format) => {
    const id = selectedFormId || formId;
    if (!id) return toast.error("Please select a form to export");
    setExportingFormat(format);
    try {
      const params = { format };
      if (selectedVersionId) params.version_id = selectedVersionId;
      const res = await API.get(`/forms/${id}/export`, { params, responseType: "blob" });
      const ext = format === "json" ? "json" : "csv";
      const verTag = selectedVersionId ? `-v${selectedVersionId}` : "";
      const filename = `form-${id}${verTag}-export.${ext}`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (err) {
      toast.error(apiMessage(err, `Failed to download ${format.toUpperCase()} export`));
    } finally {
      setExportingFormat("");
    }
  };

  // Columns — includes ALL form fields, prioritized by data presence
  const columns = useMemo(() => {
    if (!Array.isArray(formFields)) return [];
    const items = responses.items || [];
    const hasData = fId => items.some(resp => {
      const val = getFieldValue(resp, String(fId));
      return val !== null && val !== undefined && val !== "";
    });
    const sorted = [...formFields].sort((a, b) => {
      const aHas = hasData(a.id) ? 1 : 0;
      const bHas = hasData(b.id) ? 1 : 0;
      return bHas - aHas;
    });
    return sorted.map(f => ({
      id: String(f.id),
      label: f.label || `Field ${f.id}`,
      type: f.field_type || f.type || "text",
    }));
  }, [formFields, responses.items]);

  // Client-side filter on top of search results
  const visibleRows = useMemo(() => {
    return (responses.items || []).filter(resp => {
      // Version filter check form_version_id or version_id
      const respVerId = resp.form_version_id || resp.version_id;
      if (selectedVersionId && respVerId && String(respVerId) !== String(selectedVersionId)) return false;
      // Date range filter
      if (!inDateRange(resp.submitted_at, filters.dateRange)) return false;
      // Field value filters
      if (filters.fieldValues) {
        for (const [colId, term] of Object.entries(filters.fieldValues)) {
          if (!term || !term.trim()) continue;
          const val = getFieldValue(resp, colId);
          const rawDisplay = typeof val === "object" ? JSON.stringify(val) : String(val || "");
          if (!rawDisplay.toLowerCase().includes(term.toLowerCase())) return false;
        }
      }
      return true;
    });
  }, [responses.items, filters, selectedVersionId]);

  const totalPages = Math.ceil((responses.total || 0) / PAGE_SIZE);
  const currentForm = forms.find(f => String(f.id) === String(selectedFormId));

  const resetFilters = () => {
    setFilters({ dateRange: "", fieldValues: {} });
    setSelectedVersionId("");
  };

  return (
    <div className="responses-page" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 48 }}>
      
      {/* ── Dark Hero Command Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
              <Sparkles size={14} style={{ color: '#a78bfa' }} />{t('ui.enterprise_response_explorer', `Enterprise Response Explorer`)}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
              {currentForm ? currentForm.title : "Responses Command Center"}
            </h1>
            <p style={{ fontSize: 13.5, color: '#cbd5e1', margin: 0 }}>{t('ui.viewing_live_submissions', `Viewing live submissions ·`)}<strong>{responses.total || 0}</strong>{t('ui.total_records_captured_across_schema_fie', `total records captured across schema fields.`)}</p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Form Dropdown */}
            {forms.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  className="input"
                  style={{
                    height: 42,
                    background: 'rgba(255,255,255,0.12)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: 10,
                    paddingRight: 36
                  }}
                  value={selectedFormId}
                  onChange={e => {
                    setSelectedFormId(e.target.value);
                    setSelectedVersionId("");
                    setPage(1);
                    setSearch("");
                    resetFilters();
                  }}
                >
                  {forms.map(f => (
                    <option value={f.id} key={f.id} style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                      {f.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', pointerEvents: 'none' }} />
              </div>
            )}

            {/* Version Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                className="input"
                style={{
                  height: 42,
                  background: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 10,
                  paddingRight: 36
                }}
                value={selectedVersionId}
                onChange={e => {
                  setSelectedVersionId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="" style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>{t('ui.all_versions', `All Versions`)}</option>
                {versions.map(v => (
                  <option value={v.id} key={v.id} style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>{t('ui.version', `Version`)}{v.version_number} ({v.status})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', pointerEvents: 'none' }} />
            </div>

            {/* Single Link to Export Center */}
            <Link
              to="/workspace/exports"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                height: 42,
                padding: '0 18px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={15} />{t('ui.export_center', `Export Center`)}<ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Unified Data Table Panel ── */}
      <div className="responses-panel" style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'relative' }}>
        
        {/* Unified Master Toolbar */}
        <div className="resp-toolbar" style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="resp-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            
            {/* Search Input */}
            <div className="resp-search-wrap">
              <Search size={14} className="resp-search-icon" />
              <input
                type="text"
                className="input resp-search"
                placeholder={t('ui.search_submission_records', `Search submission records…`)}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 260, height: 38, borderRadius: 8 }}
              />
              {search && (
                <button className="resp-search-clear" onClick={() => { setSearch(""); setPage(1); }}>
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="resp-filter-wrap" ref={filterRef}>
              <button
                className={`btn btn-secondary resp-filter-btn ${showFilter ? "active" : ""} ${activeFilterCount > 0 ? "has-filters" : ""}`}
                onClick={() => setShowFilter(v => !v)}
                style={{ height: 38, borderRadius: 8, padding: '0 14px' }}
              >
                <SlidersHorizontal size={14} />{t('ui.filter', `Filter`)}{activeFilterCount > 0 && (
                  <span className="resp-filter-count">{activeFilterCount}</span>
                )}
              </button>

              {showFilter && (
                <FilterPanel
                  columns={columns}
                  filters={filters}
                  onChange={f => { setFilters(f); setPage(1); }}
                  onReset={resetFilters}
                  onClose={() => setShowFilter(false)}
                  activeCount={activeFilterCount}
                />
              )}
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="resp-active-chips">
                {selectedVersionId && (
                  <span className="resp-active-chip">
                    <Layers size={11} />{t('ui.version', `Version`)}{versions.find(v => String(v.id) === String(selectedVersionId))?.version_number || selectedVersionId}
                    <button onClick={() => setSelectedVersionId("")}><X size={10} /></button>
                  </span>
                )}
                {filters.dateRange && (
                  <span className="resp-active-chip">
                    <Clock size={11} /> {DATE_RANGES.find(d => d.value === filters.dateRange)?.label}
                    <button onClick={() => setFilters(f => ({ ...f, dateRange: "" }))}><X size={10} /></button>
                  </span>
                )}
                {Object.entries(filters.fieldValues || {}).map(([id, val]) =>
                  val ? (
                    <span className="resp-active-chip" key={id}>
                      <Hash size={11} /> {columns.find(c => c.id === id)?.label || id}: "{val}"
                      <button onClick={() => setFilters(f => ({ ...f, fieldValues: { ...f.fieldValues, [id]: "" } }))}><X size={10} /></button>
                    </span>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Record Count & Page Control */}
          <div className="resp-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('ui.showing', `Showing`)}{visibleRows.length}{t('ui.of', `of`)}{responses.total || 0}{t('ui.records', `records`)}</span>
            <div className="resp-pagination" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn-icon btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                title={t('ui.previous_page', `Previous page`)}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 700, padding: '0 8px', color: 'var(--text-primary)' }}>
                {page} / {totalPages || 1}
              </span>
              <button
                className="btn-icon btn-ghost"
                style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                disabled={responses.items.length < PAGE_SIZE || page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                title={t('ui.next_page', `Next page`)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Master Response Table */}
        <div className="resp-table-wrapper">
          <table className="resp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="resp-th" style={{ width: 70, paddingLeft: 24 }}>{t('ui._id', `# ID`)}</th>
                <th className="resp-th" style={{ whiteSpace: 'nowrap' }}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{t('ui.submitted_at', `SUBMITTED AT`)}</th>
                {columns.map(c => (
                  <th key={c.id} className="resp-th" style={{ whiteSpace: 'nowrap' }}>{c.label}</th>
                ))}
                <th className="resp-th resp-sticky-action-th" style={{ position: 'sticky', right: 0, background: 'var(--bg-surface-2)', zIndex: 10, textAlign: 'right', paddingRight: 24, boxShadow: '-4px 0 8px rgba(0,0,0,0.03)' }}>{t('ui.action', `ACTION`)}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="resp-skeleton-row">
                    <td colSpan={3 + columns.length} style={{ padding: 18 }}>
                      <div className="resp-skeleton-line" style={{ width: `${60 + (i % 3) * 15}%`, height: 16, background: 'var(--bg-surface-2)', borderRadius: 4 }} />
                    </td>
                  </tr>
                ))
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={3 + columns.length}>
                    <div className="resp-empty" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      {activeFilterCount > 0 || search ? (
                        <>
                          <AlertCircle size={40} style={{ color: 'var(--warning-500)' }} />
                          <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{t('ui.no_matching_responses_found', `No matching responses found`)}</strong>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('ui.try_clearing_your_search_term_or_version', `Try clearing your search term or version filter criteria.`)}</p>
                          <button className="btn btn-secondary" onClick={() => { setSearch(""); resetFilters(); }} style={{ marginTop: 8 }}>
                            <RotateCcw size={14} />{t('ui.clear_all_filters', `Clear All Filters`)}</button>
                        </>
                      ) : (
                        <>
                          <Inbox size={40} style={{ color: 'var(--text-tertiary)' }} />
                          <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>{t('ui.no_submissions_recorded_yet', `No submissions recorded yet`)}</strong>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('ui.responses_will_appear_here_dynamically_a', `Responses will appear here dynamically as respondents fill out this form.`)}</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((resp) => (
                  <tr key={resp.id} className="resp-row">
                    <td className="resp-td" style={{ paddingLeft: 24 }}>
                      <span className="resp-id-badge">#{resp.id}</span>
                    </td>
                    <td className="resp-td" style={{ whiteSpace: 'nowrap' }}>
                      <div className="resp-date-cell" style={{ whiteSpace: 'nowrap' }}>
                        <span className="resp-date-relative" style={{ whiteSpace: 'nowrap' }}>{relativeTime(resp.submitted_at)}</span>
                        <span className="resp-date-absolute" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(resp.submitted_at)}</span>
                      </div>
                    </td>
                    {columns.map(c => {
                      const raw = getFieldValue(resp, c.id);
                      return (
                        <td key={c.id} className="resp-td">
                          {renderCellValue(raw, c.type, setPreviewImageVal, file => downloadFileAttachment(file, toast), t)}
                        </td>
                      );
                    })}
                    <td className="resp-td resp-sticky-action-td" style={{ position: 'sticky', right: 0, background: 'var(--bg-surface)', zIndex: 9, textAlign: 'right', paddingRight: 24, boxShadow: '-4px 0 8px rgba(0,0,0,0.03)' }}>
                      <Link
                        to={`/workspace/forms/${selectedFormId || formId}/responses/${resp.id}`}
                        className="resp-view-btn"
                        title={t('ui.view_full_response_detail', `View full response detail`)}
                      >
                        <Eye size={13} />
                        <span>{t('ui.view', `View`)}</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Lightbox Preview Modal */}
      <ImagePreviewModal
        imageVal={previewImageVal}
        onClose={() => setPreviewImageVal(null)}
        onDownload={file => downloadFileAttachment(file, toast)}
      />
    </div>
  );
}

