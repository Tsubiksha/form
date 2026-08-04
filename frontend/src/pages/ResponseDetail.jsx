import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Download, FileText, Star, Eye, Image as ImageIcon, X } from "lucide-react";
import API from "../services/api";
import { apiMessage } from "../utils/errors";
import "./PublicForm.css";

function formatSize(bytes = 0) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImageFile(val) {
  if (!val) return false;
  const name = val.file_name || val.name || val.stored_name || "";
  const type = val.type || val.mime_type || "";
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
}

async function downloadFile(value) {
  const { data } = await API.get(value.download_url, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = value.name || value.file_name || "uploaded-file";
  link.click();
  URL.revokeObjectURL(url);
}

function ImagePreviewModal({ imageVal, onClose, onDownload }) {
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
      <div
        style={{
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
            <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{t('ui.loading_preview_image', `Loading preview image…`)}</div>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={filename}
              style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />
          ) : (
            <div style={{ color: 'var(--danger-500)', fontSize: 13 }}>{t('ui.failed_to_load_image_preview', `Failed to load image preview`)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ratingMax(fieldConfig) {
  const max = (fieldConfig?.validation_rules || []).find(rule => rule.rule_type === "max_value")?.rule_value;
  return Number.parseInt(max || "5", 10) || 5;
}

function Value({ value, fieldType, fieldConfig, onPreviewImage }) {
  if (fieldType === "rating" && value !== null && value !== undefined && value !== "") {
    const max = ratingMax(fieldConfig);
    const rating = Number(value) || 0;
    return (
      <div className="flex items-center gap-3">
        <div className="flex" style={{ color: 'var(--warning-400)' }}>
          {Array.from({ length: max }).map((_, i) => (
            <Star key={i} size={24} fill={i < rating ? "currentColor" : "transparent"} opacity={i < rating ? 1 : 0.3} />
          ))}
        </div>
        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{rating} / {max}</strong>
      </div>
    );
  }

  if (Array.isArray(value)) return <div className="flex gap-2 flex-wrap">{value.map((v, i) => <span key={i} className="badge">{v}</span>)}</div>;

  if (value && typeof value === "object" && (value.stored_name || value.download_url)) {
    const isImg = isImageFile(value);
    const filename = value.name || value.file_name || "Uploaded file";

    return (
      <div className="panel flex items-center justify-between" style={{ padding: '16px', background: 'var(--gray-50)', border: '1px solid var(--border-subtle)', maxWidth: '420px', borderRadius: 12 }}>
        <div className="flex items-center gap-3 min-w-0">
          <div style={{ padding: '10px', background: isImg ? 'var(--brand-50)' : 'var(--info-50)', color: isImg ? 'var(--brand-700)' : 'var(--info-700)', borderRadius: '10px' }}>
            {isImg ? <ImageIcon size={22} /> : <FileText size={22} />}
          </div>
          <div className="flex-col min-w-0">
            <strong className="text-h3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{filename}</strong>
            <small className="text-small" style={{ color: 'var(--text-secondary)' }}>{value.type || (isImg ? "Image File" : "Document")} · {formatSize(value.size)}</small>
          </div>
        </div>

        {isImg ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-secondary"
              onClick={() => onPreviewImage(value)}
              title={t('ui.preview_image', `Preview Image`)}
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: '8px', fontSize: 13, fontWeight: 600 }}
            >
              <Eye size={14} />{t('ui.preview', `Preview`)}</button>
            <button
              className="btn btn-secondary"
              onClick={() => downloadFile(value)}
              title={t('ui.download_file', `Download File`)}
              style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
            >
              <Download size={15} />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => downloadFile(value)}
            style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: '8px', fontSize: 13, fontWeight: 600 }}
          >
            <Download size={14} />{t('ui.download', `Download`)}</button>
        )}
      </div>
    );
  }

  if (value === null || value === undefined || value === "") {
    return <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{t('ui.no_answer_provided', `No answer provided`)}</span>;
  }

  return <div style={{ fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{String(value)}</div>;
}

export default function ResponseDetail() {
  const { t } = useTranslation();
  const { formId, responseId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [previewImageVal, setPreviewImageVal] = useState(null);

  useEffect(() => {
    API.get(`/forms/${formId}/responses/${responseId}`)
      .then(response => setItem(response.data))
      .catch(error => setError(apiMessage(error, "Unable to load response")));
  }, [formId, responseId]);

  return (
    <main className="workspace-viewport" style={{ background: 'var(--bg-surface-2)', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: '770px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => formId ? navigate(`/workspace/forms/${formId}/responses`) : navigate('/workspace/responses')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            alignSelf: 'flex-start',
            background: 'var(--bg-surface)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            fontWeight: 600,
            fontSize: 13.5,
            color: 'var(--text-primary)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ChevronLeft size={18} />{t('ui.back_to_responses', `Back to Responses`)}</button>

        {error && <div className="notice error">{error}</div>}

        {!item && !error ? (
          <div className="panel empty-state" style={{ background: 'var(--bg-surface)' }}>{t('ui.loading_response_details', `Loading response details...`)}</div>
        ) : item && (
          <>
            {/* Header Card */}
            <section className="google-card google-header-card" style={{ padding: '32px', marginBottom: '8px' }}>
              <div className="flex justify-between items-center w-full mb-4">
                <span className="badge" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)', padding: '4px 12px', fontSize: '13px' }}>{t('ui.response', `Response #`)}{item.id}</span>
                <span className="status-badge status-published">{item.status}</span>
              </div>
              <h1 className="text-h1" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>{item.form_name}</h1>
              <div className="flex items-center gap-4 text-small" style={{ color: 'var(--text-secondary)' }}>
                <span>{t('ui.submitted', `Submitted:`)}<strong>{new Date(item.submitted_at).toLocaleString()}</strong></span>
                <span>•</span>
                <span>{t('ui.form_version', `Form Version:`)}<strong>{t('ui.v', `v`)}{item.version_number}</strong></span>
              </div>
            </section>

            {/* Individual Response Cards */}
            {item.values.map(value => (
              <div key={value.field_id} className="google-card" style={{ padding: '24px 32px' }}>
                <h3 className="text-label" style={{ color: 'var(--brand-600)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  {value.field_label || `Field ${value.field_id}`}
                </h3>
                <div style={{ marginTop: '4px' }}>
                  <Value value={value.value} fieldType={value.field_type} fieldConfig={value.field_config} onPreviewImage={setPreviewImageVal} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      <ImagePreviewModal
        imageVal={previewImageVal}
        onClose={() => setPreviewImageVal(null)}
        onDownload={downloadFile}
      />
    </main>
  );
}
