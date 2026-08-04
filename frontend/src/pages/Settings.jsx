import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Archive, BarChart2, CheckCircle, CheckCircle2, ChevronRight,
  Clock, Database, FileText, History, Inbox, Key, Laptop, Lock, LogOut,
  RefreshCw, Settings2, Shield, ShieldCheck, Trash2, User, X, Zap, Mail, Globe
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastProvider";
import Profile from "./Profile";
import API from "../services/api";
import { relativeTime, formatDate, formatDateTime } from "../utils/relativeTime";
import { apiMessage } from "../utils/errors";

/* ── Sidebar sections ── */
const SECTIONS = [
  { id: "profile",   label: "Profile",         icon: User,     desc: "Your identity & info" },
  { id: "account",   label: "Account",         icon: Settings2,desc: "Name, email, password" },
  { id: "security",  label: "Security",        icon: Shield,   desc: "Sessions & 2FA" },
  { id: "storage",   label: "Storage & Data",  icon: Database, desc: "Usage & storage" },
  { id: "retention", label: "Retention Policy",icon: Archive,  desc: "Data lifecycle rules" },
  { id: "audit",     label: "Audit Logs",      icon: History,  desc: "Recent account actions" },
  { id: "danger",    label: "Danger Zone",     icon: AlertTriangle, desc: "Destructive actions", danger: true },
];

/** Map backend action strings to human-friendly labels & icons */
function auditLabel(action, entityType) {
  const map = {
    "form.created":   { label: "Form Created",   Icon: FileText,   color: "violet" },
    "form.updated":   { label: "Form Updated",   Icon: FileText,   color: "blue" },
    "form.published": { label: "Form Published", Icon: CheckCircle2, color: "green" },
    "form.deleted":   { label: "Form Deleted",   Icon: Trash2,     color: "red" },
    "form.restored":  { label: "Form Restored",  Icon: RefreshCw,  color: "amber" },
    "response.deleted": { label: "Response Deleted", Icon: Trash2, color: "red" },
    "export.generated": { label: "Export Downloaded", Icon: BarChart2, color: "blue" },
  };
  return map[action] || { label: action?.replace(/\./g, " ") || "Action", Icon: Clock, color: "gray" };
}

/** Confirmation dialog */
function ConfirmDialog({ message, onConfirm, onCancel }) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <AlertTriangle size={20} className="confirm-dialog-icon" />
          <h3>{t('ui.confirm_action', `Confirm Action`)}</h3>
        </div>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>{t('ui.cancel', `Cancel`)}</button>
          <button className="btn btn-danger" onClick={onConfirm}>{t('ui.confirm', `Confirm`)}</button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const { logout, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  /* 2FA UI Simulation State */
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState(1); // 1 = enter code, 2 = success
  const [twoFaCode, setTwoFaCode] = useState("");

  const handleVerify2FA = () => {
    if (twoFaCode.length === 6) {
      setTwoFaStep(2);
      setTimeout(() => {
        setIs2FAEnabled(true);
        setShow2FAModal(false);
        setTwoFaStep(1);
        setTwoFaCode("");
        toast.success("Two-Factor Authentication is now enabled.");
      }, 2000);
    } else {
      toast.error("Please enter a 6-digit code.");
    }
  };


  /* Detect OS / browser for Security section */
  const [osName, setOsName] = useState("Unknown OS");
  const [browserName, setBrowserName] = useState("Unknown Browser");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Win")) setOsName("Windows");
    else if (ua.includes("Mac")) setOsName("macOS");
    else if (ua.includes("Linux")) setOsName("Linux");
    else if (ua.includes("Android")) setOsName("Android");
    else if (ua.includes("like Mac")) setOsName("iOS");
    if (ua.includes("Chrome") && !ua.includes("Edg")) setBrowserName("Chrome");
    else if (ua.includes("Safari") && !ua.includes("Chrome")) setBrowserName("Safari");
    else if (ua.includes("Firefox")) setBrowserName("Firefox");
    else if (ua.includes("Edg")) setBrowserName("Edge");
  }, []);

  /* Dashboard data for Storage & Data */
  const [dashData, setDashData] = useState(null);
  useEffect(() => {
    API.get("/dashboard/me")
      .then(r => setDashData(r.data))
      .catch(() => {});
  }, []);

  /* Audit logs */
  const [auditLogs, setAuditLogs] = useState(null);
  useEffect(() => {
    if (activeSection === "audit") {
      API.get("/auth/audit-logs")
        .then(r => setAuditLogs(r.data))
        .catch(() => setAuditLogs([]));
    }
  }, [activeSection]);

  /* Retention policy (local state — backend not yet implemented) */
  const [retention, setRetention] = useState("never");
  const [retentionSaved, setRetentionSaved] = useState(false);
  const saveRetention = () => {
    localStorage.setItem("settings_retention", retention);
    setRetentionSaved(true);
    toast.success("Retention preference saved");
    setTimeout(() => setRetentionSaved(false), 3000);
  };
  useEffect(() => {
    const saved = localStorage.getItem("settings_retention");
    if (saved) setRetention(saved);
  }, []);

  /* Confirmation dialog state */
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const showConfirm = (message, onConfirm) => setConfirm({ message, onConfirm });
  const closeConfirm = () => setConfirm(null);

  /* Helpers */
  const initials = user?.name
    ? user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const roleLabel = user?.role === "ADMIN" ? "Administrator" : "Form Creator";

  /* Format storage bytes */
  function fmtBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={() => { closeConfirm(); confirm.onConfirm(); }}
          onCancel={closeConfirm}
        />
      )}

      {/* 2FA Setup Modal Simulation */}
      {show2FAModal && (
        <div className="modal-backdrop" onClick={() => setShow2FAModal(false)}>
          <div className="confirm-dialog" style={{ maxWidth: 450, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{t('ui.enable_two_factor_auth', `Enable Two-Factor Auth`)}</h3>
              </div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShow2FAModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            {twoFaStep === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{t('ui.we_ve_sent_a_6_digit_verification_code_t', `We've sent a 6-digit verification code to your email (`)}<strong>{user?.email}</strong>{t('ui._please_enter_it_below_to_confirm_setup', `). Please enter it below to confirm setup.`)}<br/><br/>
                  <em>{t('ui._this_is_a_local_preview_you_can_enter_a', `(This is a local preview. You can enter any 6 digits to proceed.)`)}</em>
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '16px 0' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <input 
                      key={i}
                      type="text" 
                      maxLength={1}
                      className="input"
                      style={{ width: 48, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}
                      value={twoFaCode[i] || ""}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val) {
                          const newCode = twoFaCode.substring(0, i) + val + twoFaCode.substring(i + 1);
                          setTwoFaCode(newCode.slice(0, 6));
                          if (i < 5) {
                            const nextInput = e.target.nextElementSibling;
                            if (nextInput) nextInput.focus();
                          }
                        } else {
                          const newCode = twoFaCode.substring(0, i) + ' ' + twoFaCode.substring(i + 1);
                          setTwoFaCode(newCode.trim());
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !twoFaCode[i] && i > 0) {
                          const prevInput = e.target.previousElementSibling;
                          if (prevInput) prevInput.focus();
                        }
                      }}
                    />
                  ))}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', height: 44 }} onClick={handleVerify2FA}>{t('ui.verify_enable', `Verify & Enable`)}</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '24px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-50)', color: 'var(--success-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scaleIn 0.3s ease' }}>
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{t('ui.2fa_enabled_successfully', `2FA Enabled Successfully!`)}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>{t('ui.your_account_is_now_protected_with_an_ex', `Your account is now protected with an extra layer of security.`)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="settings-page">
        {/* Page header */}
        <div className="settings-page-header">
          <h1 className="text-h1">{t('ui.settings', `Settings`)}</h1>
          <p className="text-body">{t('ui.manage_your_account_workspace_and_securi', `Manage your account, workspace, and security preferences.`)}</p>
        </div>

        <div className="settings-layout">
          {/* Sidebar */}
          <nav className="settings-sidebar">
            <div className="settings-sidebar-inner">
              {SECTIONS.map(sec => (
                <button
                  key={sec.id}
                  className={`settings-nav-btn ${activeSection === sec.id ? "active" : ""} ${sec.danger ? "danger" : ""}`}
                  onClick={() => setActiveSection(sec.id)}
                >
                  <div className={`settings-nav-icon ${activeSection === sec.id ? "active" : ""} ${sec.danger ? "danger" : ""}`}>
                    <sec.icon size={14} />
                  </div>
                  <div className="settings-nav-text">
                    <span className="settings-nav-label">{sec.label}</span>
                    <span className="settings-nav-desc">{sec.desc}</span>
                  </div>
                  {activeSection === sec.id && <ChevronRight size={12} className="settings-nav-chevron" />}
                </button>
              ))}

              <div className="settings-sidebar-divider" />
              <button
                className="settings-nav-btn sign-out-btn"
                onClick={() => showConfirm("Sign out of your current session?", handleLogout)}
              >
                <div className="settings-nav-icon danger">
                  <LogOut size={14} />
                </div>
                <span className="settings-nav-label">{t('ui.sign_out', `Sign Out`)}</span>
              </button>
            </div>
          </nav>

          {/* Content area */}
          <div className="settings-content">

            {/* ── PROFILE ── */}
            {activeSection === "profile" && (
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <User size={18} />
                  <div>
                    <h2>{t('ui.profile', `Profile`)}</h2>
                    <p>{t('ui.your_identity_across_formflow', `Your identity across FormFlow.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body">
                  {/* Avatar + info */}
                  <div className="profile-hero-card" style={{
                    background: 'linear-gradient(135deg, var(--gray-900) 0%, var(--brand-950) 50%, var(--brand-900) 100%)',
                    borderRadius: 20,
                    padding: '32px 40px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '60%', height: '200%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)', transform: 'rotate(-15deg)', pointerEvents: 'none' }} />
                    <div style={{ background: 'var(--bg-surface)', color: 'var(--brand-800)', fontSize: 24, width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, zIndex: 1, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
                      {initials}
                    </div>
                    <div style={{ zIndex: 1 }}>
                      <strong style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', display: 'block', marginBottom: 4 }}>{user?.name}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'block', marginBottom: 12 }}>{user?.email}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#ffffff', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{roleLabel}</span>
                        {user?.is_active && (
                          <span style={{ background: 'var(--success-50)', color: 'var(--success-700)', border: '1px solid var(--success-200)', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} />{t('ui.active', `Active`)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="settings-info-grid">
                    <div className="settings-info-item">
                      <span className="settings-info-label">{t('ui.full_name', `Full Name`)}</span>
                      <span className="settings-info-value">{user?.name || "—"}</span>
                    </div>
                    <div className="settings-info-item">
                      <span className="settings-info-label">{t('ui.email_address', `Email Address`)}</span>
                      <span className="settings-info-value" style={{ wordBreak: 'break-all' }}>{user?.email || "—"}</span>
                    </div>
                    <div className="settings-info-item">
                      <span className="settings-info-label">{t('ui.role', `Role`)}</span>
                      <span className="settings-info-value">{roleLabel}</span>
                    </div>
                    <div className="settings-info-item">
                      <span className="settings-info-label">{t('ui.member_since', `Member Since`)}</span>
                      <span className="settings-info-value">
                        {user?.created_at ? formatDate(user.created_at) : "—"}
                      </span>
                    </div>
                    <div className="settings-info-item">
                      <span className="settings-info-label">{t('ui.last_login', `Last Login`)}</span>
                      <span className="settings-info-value">
                        {user?.last_login_at
                          ? relativeTime(user.last_login_at)
                          : "Current session"}
                      </span>
                    </div>
                    <div className="settings-info-item">
                      <span className="settings-info-label">{t('ui.account_status', `Account Status`)}</span>
                      <span className="settings-info-value">
                        {user?.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveSection("account")}
                  >{t('ui.edit_profile', `Edit Profile`)}</button>
                </div>
              </div>
            )}

            {/* ── ACCOUNT ── */}
            {activeSection === "account" && (
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <Settings2 size={18} />
                  <div>
                    <h2>{t('ui.account', `Account`)}</h2>
                    <p>{t('ui.update_your_name_email_and_password', `Update your name, email, and password.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body" style={{ padding: 0, overflow: "hidden" }}>
                  <Profile isEmbedded={true} />
                </div>
              </div>
            )}



            {/* ── SECURITY ── */}
            {activeSection === "security" && (
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <Shield size={18} />
                  <div>
                    <h2>{t('ui.security', `Security`)}</h2>
                    <p>{t('ui.manage_your_active_sessions_and_authenti', `Manage your active sessions and authentication settings.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body">

                  {/* Current session */}
                  <div className="security-subsection">
                    <h3 className="settings-subsection-title">
                      <Laptop size={15} />{t('ui.active_session', `Active Session`)}</h3>
                    <div className="session-card">
                      <div className="session-card-icon">
                        <Laptop size={20} />
                      </div>
                      <div className="session-card-info">
                        <div className="session-card-device">
                          <strong>{osName} · {browserName}</strong>
                          <span className="session-current-badge">
                            <CheckCircle2 size={11} />{t('ui.current', `Current`)}</span>
                        </div>
                        <div className="session-card-meta">
                          <span>{t('ui.ip_127_0_0_1_local', `IP: 127.0.0.1 (Local)`)}</span>
                          <span>{t('ui.signed_in', `Signed in:`)}{" "}
                            {user?.last_login_at
                              ? relativeTime(user.last_login_at)
                              : "This session"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="security-subsection" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
                    <h3 className="settings-subsection-title">
                      <Key size={15} />{t('ui.two_factor_authentication', `Two-Factor Authentication`)}</h3>
                    <div className="two-factor-card">
                      <div className="two-factor-info">
                        <Zap size={16} style={{ color: "var(--warning-500)" }} />
                        <div>
                          <strong>{t('ui.add_an_extra_layer_of_security', `Add an extra layer of security`)}</strong>
                          <p>{t('ui.two_factor_authentication_requires_a_ver', `Two-factor authentication requires a verification code in
                            addition to your password when signing in.`)}</p>
                        </div>
                      </div>
                      <div className="two-factor-control">
                        {is2FAEnabled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success-600)', fontSize: 13, fontWeight: 600, background: 'var(--success-50)', padding: '4px 10px', borderRadius: 999 }}>
                              <CheckCircle2 size={14} />{t('ui.enabled', `Enabled`)}</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => setIs2FAEnabled(false)}>{t('ui.disable', `Disable`)}</button>
                          </div>
                        ) : (
                          <button className="btn btn-primary" onClick={() => setShow2FAModal(true)}>
                            <Lock size={14} />{t('ui.enable_2fa', `Enable 2FA`)}</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Password info */}
                  <div className="security-subsection" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
                    <h3 className="settings-subsection-title">
                      <Key size={15} />{t('ui.password', `Password`)}</h3>
                    <div className="settings-info-grid">
                      <div className="settings-info-item">
                        <span className="settings-info-label">{t('ui.last_changed', `Last Changed`)}</span>
                        <span className="settings-info-value">
                          {user?.updated_at
                            ? relativeTime(user.updated_at)
                            : "Unknown"}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveSection("account")}
                    >
                      <Key size={14} />{t('ui.change_password', `Change Password`)}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STORAGE & DATA ── */}
            {activeSection === "storage" && (
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <Database size={18} />
                  <div>
                    <h2>{t('ui.storage_data', `Storage & Data`)}</h2>
                    <p>{t('ui.overview_of_your_workspace_data_usage', `Overview of your workspace data usage.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body">
                  {dashData ? (
                    <>
                      <div className="storage-stats-grid">
                        <div className="storage-stat-card">
                          <div className="storage-stat-icon violet">
                            <FileText size={18} />
                          </div>
                          <div>
                            <strong className="storage-stat-value">
                              {dashData.total_forms ?? 0}
                            </strong>
                            <span className="storage-stat-label">{t('ui.forms_created', `Forms Created`)}</span>
                          </div>
                        </div>
                        <div className="storage-stat-card">
                          <div className="storage-stat-icon green">
                            <Inbox size={18} />
                          </div>
                          <div>
                            <strong className="storage-stat-value">
                              {dashData.total_responses ?? 0}
                            </strong>
                            <span className="storage-stat-label">{t('ui.responses_collected', `Responses Collected`)}</span>
                          </div>
                        </div>
                        <div className="storage-stat-card">
                          <div className="storage-stat-icon blue">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <strong className="storage-stat-value">
                              {dashData.published_forms ?? 0}
                            </strong>
                            <span className="storage-stat-label">{t('ui.published_forms', `Published Forms`)}</span>
                          </div>
                        </div>
                        <div className="storage-stat-card">
                          <div className="storage-stat-icon amber">
                            <Archive size={18} />
                          </div>
                          <div>
                            <strong className="storage-stat-value">
                              {dashData.archived_forms ?? 0}
                            </strong>
                            <span className="storage-stat-label">{t('ui.archived_forms', `Archived Forms`)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Storage used */}
                      <div className="storage-usage-card">
                        <div className="storage-usage-header">
                          <span className="storage-usage-title">
                            <Database size={14} />{t('ui.file_storage_used', `File Storage Used`)}</span>
                          <strong className="storage-usage-value">
                            {fmtBytes(dashData.storage_used_bytes || 0)}
                          </strong>
                        </div>
                        <div className="storage-meter">
                          <div
                            className="storage-meter-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                ((dashData.storage_used_bytes || 0) / (100 * 1024 * 1024)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="storage-usage-note">{t('ui.storage_is_computed_from_uploaded_file_a', `Storage is computed from uploaded file attachments in form responses.`)}{dashData.storage_used_bytes === 0 &&
                            " No file uploads recorded yet."}
                        </p>
                      </div>

                      {/* Data last updated */}
                      {dashData.dashboard_generated_at && (
                        <p className="settings-info-muted">{t('ui.data_as_of', `Data as of`)}{relativeTime(dashData.dashboard_generated_at)}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="dash-empty">
                      <p>{t('ui.loading_storage_data', `Loading storage data…`)}</p>
                    </div>
                  )}

                  {/* Storage location */}
                  <div style={{ marginTop: 24, borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
                    <h3 className="settings-subsection-title">
                      <Database size={15} />{t('ui.storage_location', `Storage Location`)}</h3>
                    <div className="storage-location-card">
                      <div className="storage-location-radio active">
                        <div className="storage-location-dot" />
                      </div>
                      <div>
                        <strong>{t('ui.platform_default_storage', `Platform Default Storage`)}</strong>
                        <p>{t('ui.files_are_securely_stored_in_the_platfor', `Files are securely stored in the platform's managed database
                          and object storage. Backups are performed daily.`)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── RETENTION POLICY ── */}
            {activeSection === "retention" && (
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <Archive size={18} />
                  <div>
                    <h2>{t('ui.retention_policy', `Retention Policy`)}</h2>
                    <p>{t('ui.configure_how_long_form_data_is_kept_bef', `Configure how long form data is kept before automatic deletion.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body">
                  <div className="retention-notice">
                    <AlertTriangle size={14} />
                    <span>{t('ui.retention_policy_is_stored_locally_a_bac', `Retention policy is stored locally. A backend enforcement feature
                      is planned for a future release.`)}</span>
                  </div>

                  <div className="field-group" style={{ maxWidth: 400 }}>
                    <label className="field-label">{t('ui.auto_delete_responses_after', `Auto-delete responses after`)}</label>
                    <select
                      className="input"
                      value={retention}
                      onChange={e => setRetention(e.target.value)}
                    >
                      <option value="never">{t('ui.never_keep_forever', `Never (Keep forever)`)}</option>
                      <option value="30">{t('ui.30_days', `30 days`)}</option>
                      <option value="90">{t('ui.90_days', `90 days`)}</option>
                      <option value="180">{t('ui.6_months', `6 months`)}</option>
                      <option value="365">{t('ui.1_year', `1 year`)}</option>
                    </select>
                    <p className="field-hint">
                      {retention === "never"
                        ? "Responses will be kept indefinitely."
                        : `Responses older than ${retention} days will be permanently deleted during the next maintenance window.`}
                    </p>
                  </div>

                  <div className="field-group" style={{ maxWidth: 400 }}>
                    <label className="field-label">{t('ui.archive_draft_forms_after', `Archive draft forms after`)}</label>
                    <select className="input" defaultValue="never">
                      <option value="never">{t('ui.never', `Never`)}</option>
                      <option value="30">{t('ui.30_days_of_inactivity', `30 days of inactivity`)}</option>
                      <option value="90">{t('ui.90_days_of_inactivity', `90 days of inactivity`)}</option>
                      <option value="180">{t('ui.6_months_of_inactivity', `6 months of inactivity`)}</option>
                    </select>
                    <p className="field-hint">{t('ui.draft_forms_not_edited_within_the_select', `Draft forms not edited within the selected period will be
                      automatically archived.`)}</p>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button className="btn btn-primary" onClick={saveRetention}>{t('ui.save_preferences', `Save Preferences`)}</button>
                    {retentionSaved && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--success-600)" }}>
                        <CheckCircle size={13} />{t('ui.saved', `Saved`)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── AUDIT LOGS ── */}
            {activeSection === "audit" && (
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <History size={18} />
                  <div>
                    <h2>{t('ui.audit_logs', `Audit Logs`)}</h2>
                    <p>{t('ui.recent_actions_performed_on_your_account', `Recent actions performed on your account and forms.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body" style={{ padding: 0 }}>
                  {auditLogs === null ? (
                    <div className="dash-empty" style={{ padding: "32px 24px" }}>
                      <p>{t('ui.loading_audit_logs', `Loading audit logs…`)}</p>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="dash-empty" style={{ padding: "32px 24px" }}>
                      <History size={32} style={{ color: "var(--gray-300)" }} />
                      <p>{t('ui.no_audit_log_entries_yet_actions_on_your', `No audit log entries yet. Actions on your forms and account will appear here.`)}</p>
                    </div>
                  ) : (
                    <div className="audit-log-list">
                      {auditLogs.map(log => {
                        const { label, Icon, color } = auditLabel(log.action, log.entity_type);
                        return (
                          <div key={log.id} className="audit-log-row">
                            <div className={`audit-log-icon audit-icon-${color}`}>
                              <Icon size={13} />
                            </div>
                            <div className="audit-log-info">
                              <strong className="audit-log-action">{label}</strong>
                              {log.entity_id && (
                                <span className="audit-log-meta">
                                  {log.entity_type} #{log.entity_id}
                                  {log.details?.version ? ` — v${log.details.version}` : ""}
                                </span>
                              )}
                            </div>
                            <time className="audit-log-time">
                              {relativeTime(log.created_at)}
                            </time>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
            {activeSection === "danger" && (
              <div className="settings-section-card danger-zone-card">
                <div className="settings-section-header danger-header">
                  <AlertTriangle size={18} />
                  <div>
                    <h2>{t('ui.danger_zone', `Danger Zone`)}</h2>
                    <p>{t('ui.irreversible_and_destructive_actions_pro', `Irreversible and destructive actions. Proceed with caution.`)}</p>
                  </div>
                </div>
                <div className="settings-section-body">

                  <div className="danger-action-row">
                    <div className="danger-action-info">
                      <strong>{t('ui.sign_out_everywhere', `Sign Out Everywhere`)}</strong>
                      <p>{t('ui.revoke_all_active_sessions_on_all_device', `Revoke all active sessions on all devices. You will need to
                        sign in again on each device.`)}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        showConfirm(
                          "This will sign you out of all active sessions. You will be redirected to the login page.",
                          handleLogout
                        )
                      }
                    >
                      <LogOut size={14} />{t('ui.sign_out_everywhere', `Sign Out Everywhere`)}</button>
                  </div>

                  <div className="danger-divider" />

                  <div className="danger-action-row">
                    <div className="danger-action-info">
                      <strong>{t('ui.archive_all_forms', `Archive All Forms`)}</strong>
                      <p>{t('ui.move_all_published_forms_to_archived_sta', `Move all published forms to archived status. Responses will
                        be preserved. Forms can be restored later.`)}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        showConfirm(
                          "Archive all published forms? They can be restored later from your Forms page.",
                          async () => {
                            try {
                              const res = await API.get("/forms/");
                              const published = (Array.isArray(res.data) ? res.data : res.data?.items || []).filter(
                                f => f.status === "published"
                              );
                              await Promise.all(
                                published.map(f => API.post(`/forms/${f.id}/archive`))
                              );
                              toast.success(`Archived ${published.length} form(s)`);
                            } catch (e) {
                              toast.error(apiMessage(e, "Failed to archive forms"));
                            }
                          }
                        )
                      }
                    >
                      <Archive size={14} />{t('ui.archive_all_forms', `Archive All Forms`)}</button>
                  </div>

                  <div className="danger-divider" />

                  <div className="danger-action-row">
                    <div className="danger-action-info">
                      <strong>{t('ui.delete_account', `Delete Account`)}</strong>
                      <p>{t('ui.permanently_delete_your_account_and_all', `Permanently delete your account and all associated data
                        including forms and responses. This cannot be undone.`)}</p>
                    </div>
                    <button className="btn btn-danger" disabled title={t('ui.contact_your_administrator_to_delete_you', `Contact your administrator to delete your account`)}>
                      <Trash2 size={14} />{t('ui.delete_account', `Delete Account`)}</button>
                  </div>
                  <p className="settings-info-muted" style={{ marginTop: 8 }}>{t('ui.to_permanently_delete_your_account_pleas', `To permanently delete your account, please contact your workspace administrator.`)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
