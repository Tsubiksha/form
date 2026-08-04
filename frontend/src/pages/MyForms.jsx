import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText, Plus, Search, Filter, MoreVertical,
  Eye, BarChart2, Trash2, Copy, Archive, Share2,
  CheckCircle2, Clock, Inbox, X, ExternalLink
} from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import ConfirmModal from "../components/ConfirmModal";
import { apiMessage } from "../utils/errors";
import { relativeTime } from "../utils/relativeTime";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

import { createPortal } from "react-dom";

function FormContextMenu({ form, anchor, onClose, onAction }) {
  const { t } = useTranslation();
  const menuRef = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        // Exclude the anchor so we don't double-fire events
        if (anchor && anchor.contains(e.target)) return;
        onClose();
      }
    };
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("keydown", esc); };
  }, [onClose, anchor]);

  const rect = anchor?.getBoundingClientRect();
  const style = rect ? {
    position: "fixed",
    top: Math.min(rect.bottom + 4, window.innerHeight - 240),
    left: Math.min(rect.left, window.innerWidth - 200),
    zIndex: 300,
  } : { display: "none" };

  return createPortal(
    <div ref={menuRef} className="form-context-menu" style={style}>
      <button onClick={(e) => { e.stopPropagation(); onAction("builder"); }}><ExternalLink size={14} />{t('ui.open_builder', `Open Builder`)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAction("preview"); }}><Eye size={14} />{t('ui.preview', `Preview`)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAction("responses"); }}><Inbox size={14} />{t('ui.view_responses', `View Responses`)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAction("analytics"); }}><BarChart2 size={14} />{t('ui.analytics', `Analytics`)}</button>
      <div className="form-context-menu-divider" />
      <button onClick={(e) => { e.stopPropagation(); onAction("duplicate"); }}><Copy size={14} />{t('ui.duplicate', `Duplicate`)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAction("publish"); }}>
        {form.is_published ? <><Archive size={14} />{t('ui.unpublish', `Unpublish`)}</> : <><CheckCircle2 size={14} />{t('ui.publish', `Publish`)}</>}
      </button>
      <button onClick={(e) => { e.stopPropagation(); onAction("archive"); }}><Archive size={14} />{t('ui.archive', `Archive`)}</button>
      <button onClick={(e) => { e.stopPropagation(); onAction("share"); }}><Share2 size={14} />{t('ui.copy_share_link', `Copy Share Link`)}</button>
      <div className="form-context-menu-divider" />
      <button className="danger" onClick={(e) => { e.stopPropagation(); onAction("delete"); }}><Trash2 size={14} />{t('ui.delete', `Delete`)}</button>
    </div>,
    document.body
  );
}

function FormCard({ form, onMenuAction }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const navigate = useNavigate();

  const st = form.is_published ? "published" : (form.status || "draft");

  return (
    <div className="form-card" onDoubleClick={() => navigate(`/workspace/forms/${form.id}/builder`)}>
      <div className="form-card-top">
        <div className="form-card-icon"><FileText size={18} /></div>
        <span className={`status-badge status-${st}`}>{st}</span>
      </div>

      <div className="form-card-body">
        <div className="form-card-title">{form.title}</div>
        {form.description && (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {form.description}
          </p>
        )}
        <div className="form-card-meta">
          <span className="form-card-stat">
            <Inbox size={12} /> {form.response_count || 0}{t('ui.responses', `responses`)}</span>
          <span className="form-card-stat">
            <Clock size={12} /> {relativeTime(form.updated_at)}
          </span>
        </div>
      </div>

      <div className="form-card-actions">
        <Link
          to={`/workspace/forms/${form.id}/builder`}
          className="btn btn-primary btn-sm"
          onClick={e => e.stopPropagation()}
        >{t('ui.open_builder', `Open Builder`)}</Link>
        <Link
          to={`/workspace/forms/${form.id}/responses`}
          className="btn btn-secondary btn-sm"
          onClick={e => e.stopPropagation()}
        >
          <Inbox size={12} />{t('ui.responses', `Responses`)}</Link>
        <button
          ref={menuBtnRef}
          className="btn btn-ghost btn-icon btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          title={t('ui.more_actions', `More actions`)}
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {menuOpen && (
        <FormContextMenu
          form={form}
          anchor={menuBtnRef.current}
          onClose={() => setMenuOpen(false)}
          onAction={(action) => {
            setMenuOpen(false);
            onMenuAction(form, action);
          }}
        />
      )}
    </div>
  );
}

export default function MyForms() {
  const { t } = useTranslation();
  const [forms, setForms] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const PAGE_SIZE = 24;
  const toast = useToast();
  const navigate = useNavigate();

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await API.get("/forms/", { params });
      setForms(data);
    } catch (error) {
      toast.error(apiMessage(error, "Failed to load forms"));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, toast]);

  useEffect(() => { loadForms(); }, [loadForms]);

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setBusy(true);
    try {
      await API.delete(`/forms/${deleteModal.id}`);
      toast.success("Form deleted");
      setDeleteModal(null);
      loadForms();
    } catch (err) {
      toast.error(apiMessage(err, `Delete failed`));
    } finally {
      setBusy(false);
    }
  };

  const handleMenuAction = async (form, action) => {
    try {
      switch (action) {
        case "builder":
          navigate(`/workspace/forms/${form.id}/builder`);
          break;
        case "preview":
          navigate(`/workspace/forms/${form.id}/preview`);
          break;
        case "responses":
          navigate(`/workspace/forms/${form.id}/responses`);
          break;
        case "analytics":
          navigate(`/workspace/forms/${form.id}/analytics`);
          break;
        case "duplicate": {
          await API.post(`/forms/${form.id}/duplicate`);
          toast.success("Form duplicated");
          loadForms();
          break;
        }
        case "publish": {
          if (form.is_published) {
            await API.post(`/forms/${form.id}/unpublish`);
            toast.success("Form unpublished");
          } else {
            await API.post(`/forms/${form.id}/publish`);
            toast.success("Form published");
          }
          loadForms();
          break;
        }
        case "archive": {
          await API.post(`/forms/${form.id}/archive`);
          toast.success("Form archived");
          loadForms();
          break;
        }
        case "share": {
          const { data } = await API.post(`/forms/${form.id}/generate-link`);
          const url = `${window.location.origin}/f/${data.link_token}`;
          await navigator.clipboard.writeText(url);
          toast.success("Share link copied to clipboard");
          break;
        }
        case "delete": {
          setDeleteModal(form);
          break;
        }
        default: break;
      }
    } catch (err) {
      toast.error(apiMessage(err, `Action failed`));
    }
  };

  const totalPages = Math.ceil(forms.total / PAGE_SIZE);
  const filteredItems = forms.items || [];

  return (
    <div className="forms-page">
      <ConfirmModal
        open={!!deleteModal}
        title={t('ui.delete_form', `Delete Form`)}
        message={`Are you sure you want to completely remove "${deleteModal?.title}"? This cannot be undone.`}
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(null)}
      />
      {/* Header */}
      <div className="forms-page-header">
        <div>
          <h1 className="text-h1">{t('ui.forms', `Forms`)}</h1>
          <p className="text-body">{t('ui.manage_and_build_your_data_collection_fo', `Manage and build your data collection forms.`)}</p>
        </div>
        <Link to="/workspace/create-form" className="btn btn-primary btn-lg">
          <Plus size={16} />{t('ui.new_form', `New Form`)}</Link>
      </div>

      {/* Toolbar */}
      <div className="forms-toolbar">
        {/* Status Tabs */}
        <div className="status-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              className={`status-tab ${statusFilter === tab.value ? "active" : ""}`}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="forms-search-wrap" style={{ flex: 1, maxWidth: 280 }}>
          <Search size={13} className="forms-search-icon" />
          <input
            type="text"
            className="forms-search-input"
            placeholder={t('ui.search_forms', `Search forms...`)}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <span className="text-small" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {forms.total} {forms.total === 1 ? "form" : "forms"}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="forms-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 12 }} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="panel empty-state">
          <FileText size={48} />
          <h3>{search ? "No forms match your search" : "No forms yet"}</h3>
          <p>{search ? "Try a different search term or clear the filter." : "Get started by creating your first form."}</p>
          {!search && (
            <Link to="/workspace/create-form" className="btn btn-primary">
              <Plus size={14} />{t('ui.create_form', `Create Form`)}</Link>
          )}
        </div>
      ) : (
        <>
          <div className="forms-grid">
            {filteredItems.map(form => (
              <FormCard key={form.id} form={form} onMenuAction={handleMenuAction} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >{t('ui.previous', `Previous`)}</button>
              <span className="text-small">{t('ui.page', `Page`)}{page}{t('ui.of', `of`)}{totalPages}</span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >{t('ui.next', `Next`)}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
