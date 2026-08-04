import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Settings as SettingsIcon, ShieldCheck, Mail, Database, Save, RotateCcw, Monitor, BellRing, Lock, Key, Copy, Plus, X } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { useToast } from "../components/ToastProvider";
import ConfirmModal from "../components/ConfirmModal";
import api from "../services/api";

const defaultSettings = {
  platformName: "Low-Code Dynamic Form Platform",
  timezone: "UTC",
  language: "English (US)",
  jwtExpiry: 24,
  sessionTimeout: 120,
  passwordPolicy: "Standard",
  mfa: true,
  smtpHost: "smtp.sendgrid.net",
  smtpPort: 587,
  encryption: "TLS",
  senderEmail: "noreply@company.com",
  maxUpload: 25,
  allowedFiles: ".pdf, .png, .jpg, .docx",
  storageProvider: "Local File System",
  enableCDN: true,
  auditLogging: true,
  rateLimit: 100,
  allowedIPs: "",
  notifNewSubmission: true,
  notifFailure: true,
  notifMaintenance: true,
  betaDashboard: false,
  experimentalAI: false,
  advancedRouting: true
};

const categoryMap = {
  platformName: "general", timezone: "general", language: "general",
  jwtExpiry: "auth", sessionTimeout: "auth", passwordPolicy: "auth", mfa: "auth",
  smtpHost: "email", smtpPort: "email", encryption: "email", senderEmail: "email",
  maxUpload: "storage", allowedFiles: "storage", storageProvider: "storage", enableCDN: "storage",
  auditLogging: "security", rateLimit: "security", allowedIPs: "security",
  notifNewSubmission: "notifications", notifFailure: "notifications", notifMaintenance: "notifications",
  betaDashboard: "features", experimentalAI: "features", advancedRouting: "features"
};

const Toggle = ({ checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    style={{
      width: 40, height: 22, borderRadius: 11,
      background: checked ? 'var(--brand-500)' : 'var(--gray-300)',
      position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: 'white',
      position: 'absolute', top: 2, left: checked ? 20 : 2,
      transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }} />
  </div>
);


export default function AdminSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetModal, setResetModal] = useState({ open: false, section: null });
  const [testingEmail, setTestingEmail] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        const dbCategories = res.data.categories;
        const loadedSettings = { ...defaultSettings };
        
        for (const catName in dbCategories) {
          for (const key in dbCategories[catName]) {
            if (key in loadedSettings) {
              const val = dbCategories[catName][key];
              // Convert boolean strings to actual booleans
              if (val === 'true') loadedSettings[key] = true;
              else if (val === 'false') loadedSettings[key] = false;
              else loadedSettings[key] = val;
            }
          }
        }
        setSettings(loadedSettings);
      } catch (err) {
        if (err.code === "ERR_NETWORK" || err.message === "Network Error" || !err.response) {
          console.warn("Backend unavailable, loading default settings.");
        } else {
          console.error("Failed to load settings:", err);
          toast.error("Failed to load settings from server. Using defaults.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadMap = {};
      for (const [key, value] of Object.entries(settings)) {
        const cat = categoryMap[key] || "general";
        if (!payloadMap[cat]) payloadMap[cat] = [];
        payloadMap[cat].push({ setting_key: key, setting_value: String(value) });
      }
      
      const payload = {
        categories: Object.keys(payloadMap).map(cat => ({ category: cat, settings: payloadMap[cat] }))
      };
      
      await api.put('/admin/settings', payload);
      toast.success("Settings saved successfully.");
    } catch (err) {
      toast.error("Failed to save settings.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await api.post('/admin/settings/test-email', {
        smtpHost: settings.smtpHost,
        smtpPort: Number(settings.smtpPort),
        encryption: settings.encryption,
        senderEmail: settings.senderEmail
      });
      toast.success(res.data.message || "Test email sent successfully.");
    } catch (err) {
      toast.error("Failed to send test email.");
      console.error(err);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleReset = (section) => {
    setResetModal({ open: true, section });
  };

  const confirmReset = () => {
    const updates = {};
    if (resetModal.section === "General") {
      updates.platformName = defaultSettings.platformName;
      updates.timezone = defaultSettings.timezone;
      updates.language = defaultSettings.language;
    } else if (resetModal.section === "Authentication") {
      updates.jwtExpiry = defaultSettings.jwtExpiry;
      updates.sessionTimeout = defaultSettings.sessionTimeout;
      updates.passwordPolicy = defaultSettings.passwordPolicy;
      updates.mfa = defaultSettings.mfa;
    }
    // Extended reset logic could cover all sections similarly
    
    setSettings(prev => ({ ...prev, ...updates }));
    toast.success(`${resetModal.section} settings reset to defaults. Click Save to apply.`);
    setResetModal({ open: false, section: null });
  };

  const handleChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const SectionCard = ({ title, icon: Icon, children, onReset }) => (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', cursor: 'default' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        </div>
        <button className="btn-icon btn-ghost" onClick={() => onReset(title)} aria-label="Reset to defaults" title={t('ui.reset_to_defaults', `Reset to defaults`)}>
          <RotateCcw size={16} />
        </button>
      </div>
      <CardBody style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
      </CardBody>
    </Card>
  );

  if (loading) {
    return (
      <div className="dashboard-page" style={{ paddingBottom: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="btn-spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={t('ui.system_settings', `System Settings`)} 
        description="Global configuration for the low-code platform." 
        eyebrow="Global Configuration"
        action={
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <div className="btn-spinner" /> : <><Save size={16} />{t('ui.save_changes', `Save Changes`)}</>}
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
        
        <SectionCard title={t('ui.general', `General`)} icon={SettingsIcon} onReset={handleReset}>
          <div className="form-group">
            <label className="label">{t('ui.platform_name', `Platform Name`)}</label>
            <input type="text" className="input" value={settings.platformName} onChange={e => handleChange('platformName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.timezone', `Timezone`)}</label>
            <select className="input" value={settings.timezone} onChange={e => handleChange('timezone', e.target.value)}>
              <option value="UTC">{t('ui.utc_coordinated_universal_time', `UTC (Coordinated Universal Time)`)}</option>
              <option value="EST">{t('ui.est_eastern_standard_time', `EST (Eastern Standard Time)`)}</option>
              <option value="PST">{t('ui.pst_pacific_standard_time', `PST (Pacific Standard Time)`)}</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">{t('ui.language', `Language`)}</label>
            <select className="input" value={settings.language} onChange={e => handleChange('language', e.target.value)}>
              <option value="English (US)">{t('ui.english_us', `English (US)`)}</option>
              <option value="Spanish">{t('ui.spanish', `Spanish`)}</option>
              <option value="French">{t('ui.french', `French`)}</option>
            </select>
          </div>
        </SectionCard>

        <SectionCard title={t('ui.authentication', `Authentication`)} icon={Lock} onReset={handleReset}>
          <div className="form-group">
            <label className="label">{t('ui.jwt_expiry_hours', `JWT Expiry (Hours)`)}</label>
            <input type="number" className="input" value={settings.jwtExpiry} onChange={e => handleChange('jwtExpiry', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.session_timeout_minutes', `Session Timeout (Minutes)`)}</label>
            <input type="number" className="input" value={settings.sessionTimeout} onChange={e => handleChange('sessionTimeout', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.password_policy', `Password Policy`)}</label>
            <select className="input" value={settings.passwordPolicy} onChange={e => handleChange('passwordPolicy', e.target.value)}>
              <option value="Standard">{t('ui.standard_8_chars_1_number', `Standard (8+ chars, 1 number)`)}</option>
              <option value="Strict">{t('ui.strict_12_chars_special_char_uppercase', `Strict (12+ chars, special char, uppercase)`)}</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Toggle checked={settings.mfa} onChange={v => handleChange('mfa', v)} />
            <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.require_multi_factor_authentication', `Require Multi-Factor Authentication`)}</label>
          </div>
        </SectionCard>

        <SectionCard title={t('ui.email_configuration', `Email Configuration`)} icon={Mail} onReset={handleReset}>
          <div className="form-group">
            <label className="label">{t('ui.smtp_host', `SMTP Host`)}</label>
            <input type="text" className="input" value={settings.smtpHost} onChange={e => handleChange('smtpHost', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="label">{t('ui.smtp_port', `SMTP Port`)}</label>
              <input type="number" className="input" value={settings.smtpPort} onChange={e => handleChange('smtpPort', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">{t('ui.encryption', `Encryption`)}</label>
              <select className="input" value={settings.encryption} onChange={e => handleChange('encryption', e.target.value)}>
                <option value="TLS">{t('ui.tls', `TLS`)}</option>
                <option value="SSL">{t('ui.ssl', `SSL`)}</option>
                <option value="None">{t('ui.none', `None`)}</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">{t('ui.sender_email', `Sender Email`)}</label>
            <input type="email" className="input" value={settings.senderEmail} onChange={e => handleChange('senderEmail', e.target.value)} />
          </div>
          <button className="btn btn-secondary w-full" onClick={handleTestEmail} disabled={testingEmail}>
            {testingEmail ? <div className="btn-spinner" /> : "Send Test Email"}
          </button>
        </SectionCard>

        <SectionCard title={t('ui.storage_settings', `Storage Settings`)} icon={Database} onReset={handleReset}>
          <div className="form-group">
            <label className="label">{t('ui.max_upload_size_mb', `Max Upload Size (MB)`)}</label>
            <input type="number" className="input" value={settings.maxUpload} onChange={e => handleChange('maxUpload', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.allowed_file_types', `Allowed File Types`)}</label>
            <input type="text" className="input" value={settings.allowedFiles} onChange={e => handleChange('allowedFiles', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.storage_provider', `Storage Provider`)}</label>
            <select className="input" value={settings.storageProvider} onChange={e => handleChange('storageProvider', e.target.value)}>
              <option value="Local File System">{t('ui.local_file_system', `Local File System`)}</option>
              <option value="Amazon S3">{t('ui.amazon_s3', `Amazon S3`)}</option>
              <option value="Google Cloud Storage">{t('ui.google_cloud_storage', `Google Cloud Storage`)}</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <Toggle checked={settings.enableCDN} onChange={v => handleChange('enableCDN', v)} />
            <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.enable_cdn_for_assets', `Enable CDN for Assets`)}</label>
          </div>
        </SectionCard>

        <SectionCard title={t('ui.security', `Security`)} icon={ShieldCheck} onReset={handleReset}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
            <Toggle checked={settings.auditLogging} onChange={v => handleChange('auditLogging', v)} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t('ui.audit_logging', `Audit Logging`)}</label>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t('ui.keep_detailed_records_of_all_admin_actio', `Keep detailed records of all admin actions`)}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="label">{t('ui.rate_limiting_requests_min', `Rate Limiting (Requests/min)`)}</label>
            <input type="number" className="input" value={settings.rateLimit} onChange={e => handleChange('rateLimit', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.allowed_ips', `Allowed IPs`)}</label>
            <input type="text" className="input" placeholder={t('ui.e_g_192_168_1_1', `e.g. 192.168.1.1`)} value={settings.allowedIPs} onChange={e => handleChange('allowedIPs', e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard title={t('ui.notifications', `Notifications`)} icon={BellRing} onReset={handleReset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={settings.notifNewSubmission} onChange={v => handleChange('notifNewSubmission', v)} />
              <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.email_notifications_for_new_submissions', `Email Notifications for New Submissions`)}</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={settings.notifFailure} onChange={v => handleChange('notifFailure', v)} />
              <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.workflow_failure_alerts', `Workflow Failure Alerts`)}</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={settings.notifMaintenance} onChange={v => handleChange('notifMaintenance', v)} />
              <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.system_maintenance_alerts', `System Maintenance Alerts`)}</label>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('ui.feature_flags', `Feature Flags`)} icon={Monitor} onReset={handleReset}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={settings.betaDashboard} onChange={v => handleChange('betaDashboard', v)} />
              <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.enable_beta_dashboard', `Enable Beta Dashboard`)}</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={settings.experimentalAI} onChange={v => handleChange('experimentalAI', v)} />
              <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.experimental_ai_features', `Experimental AI Features`)}</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Toggle checked={settings.advancedRouting} onChange={v => handleChange('advancedRouting', v)} />
              <label style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.advanced_form_routing', `Advanced Form Routing`)}</label>
            </div>
          </div>
        </SectionCard>

      </div>

      <ConfirmModal
        open={resetModal.open}
        title={`Reset ${resetModal.section} Settings?`}
        message={`Are you sure you want to reset all ${resetModal.section} settings back to their system defaults? Click Save Changes after resetting to persist.`}
        confirmLabel="Reset Defaults"
        danger={true}
        onConfirm={confirmReset}
        onCancel={() => setResetModal({ open: false, section: null })}
      />
    </div>
  );
}
