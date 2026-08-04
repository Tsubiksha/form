import { useTranslation } from "react-i18next";
export default function ConfirmModal({ open, title, message, busy, confirmLabel = "Delete", busyLabel = "Working…", danger = true, onConfirm, onCancel }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" style={{ padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-subtle)' }}>
        <h2 id="confirm-title" style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>{t('ui.cancel', `Cancel`)}</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
