import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiMessage, validEmail, validPassword } from "../utils/errors";
import { CheckCircle2, Zap, Shield, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";

export default function Login({ admin = false }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email) next.email = "Email is required";
    else if (!validEmail(form.email)) next.email = "Please enter a valid email address";
    if (!form.password) next.password = "Password is required";
    else if (!validPassword(form.password)) next.password = "Password must be at least 6 characters";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const user = await login(form);
      const isAdmin = user.role === "ADMIN";
      if (admin && !isAdmin) { await logout(); setErrors({ form: "This account does not have administrator access" }); return; }
      if (!admin && isAdmin) { await logout(); setErrors({ form: "Administrators must use the admin login" }); return; }
      navigate(isAdmin ? "/admin/dashboard" : "/workspace/home", { replace: true });
    } catch (err) {
      setErrors({ form: apiMessage(err, "Invalid email or password") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', fontFamily: "'Inter', sans-serif", background: 'var(--bg-surface)' }}>
      {/* Left Hero Showcase Panel */}
      <div style={{
        background: '#030712',
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.25) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(79, 70, 229, 0.2) 0%, transparent 50%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 64px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Top Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 4px 20px rgba(124, 58, 237, 0.5)'
          }}>{t('ui.f', `F`)}</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>{t('ui.formflow', `FormFlow`)}</span>
        </div>

        {/* Center Hero Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 500, margin: '40px 0' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            backdropFilter: 'blur(8px)',
            padding: '4px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: '#c4b5fd',
            marginBottom: 20
          }}>
            <Sparkles size={14} />{t('ui.next_gen_form_platform', `Next-Gen Form Platform`)}</div>

          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: 16 }}>
            {admin ? "Executive & Platform Administration" : "Build powerful forms, collect responses, and automate data collection."}
          </h1>

          <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6, marginBottom: 36 }}>
            {admin
              ? "Access platform health analytics, manage enterprise users, inspect system audit trails, and oversee data retention."
              : "Empower your team to build custom forms, analyze real-time responses, and generate exports in one unified workspace."}
          </p>

          {!admin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Zap, title: "Drag-and-Drop Form Builder", desc: "Intuitive schema editor with conditional rules" },
                { icon: BarChart3, title: "Real-Time Response Velocity", desc: "Live submission feeds and analytics charts" },
                { icon: ShieldCheck, title: "Enterprise Security & Audit Logs", desc: "Full audit tracking and role-based permissions" }
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: '14px 18px',
                  backdropFilter: 'blur(12px)'
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'white' }}>{title}</strong>
                    <small style={{ fontSize: 12, color: '#64748b' }}>{desc}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Trust Proof */}
        <div style={{ position: 'relative', zIndex: 2, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{t('ui.trusted_by_enterprise_teams_data_collect', `Trusted by enterprise teams & data collectors`)}</span>
          <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>{t('ui.v2_4_0', `v2.4.0`)}</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 40px', background: 'var(--bg-surface)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>
              {admin ? "Admin Sign In" : "Welcome Back"}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              {admin ? "Sign in to access the platform administration portal." : "Sign in to your FormFlow workspace account."}
            </p>
          </div>

          {/* Alert Error */}
          {errors.form && (
            <div style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)', color: 'var(--danger-600)', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, fontWeight: 500 }}>
              {errors.form}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{t('ui.email_address', `Email Address`)}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  autoFocus
                  placeholder={t('ui.you_company_com', `you@company.com`)}
                  style={{
                    width: '100%',
                    height: 44,
                    border: errors.email ? '1px solid var(--danger-500)' : '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '0 14px 0 40px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-surface-2)',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={e => e.target.style.background = 'var(--bg-surface)'}
                  onBlur={e => e.target.style.background = 'var(--bg-surface-2)'}
                />
              </div>
              {errors.email && <span style={{ fontSize: 12, color: 'var(--danger-600)', fontWeight: 500 }}>{errors.email}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{t('ui.password', `Password`)}</label>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    height: 44,
                    border: errors.password ? '1px solid var(--danger-500)' : '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '0 44px 0 40px',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-surface-2)',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease'
                  }}
                  onFocus={e => e.target.style.background = 'var(--bg-surface)'}
                  onBlur={e => e.target.style.background = 'var(--bg-surface-2)'}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}
                  title={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span style={{ fontSize: 12, color: 'var(--danger-600)', fontWeight: 500 }}>{errors.password}</span>}
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                height: 46,
                marginTop: 6,
                background: 'var(--brand-600)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {busy ? "Signing in…" : <>{t('ui.sign_in', `Sign In`)}<ArrowRight size={16} /></>}
            </button>
          </form>

          {!admin && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 28 }}>{t('ui.new_to_formflow', `New to FormFlow?`)}{" "}
              <Link to="/register" style={{ color: 'var(--brand-600)', fontWeight: 600, textDecoration: 'none' }}>{t('ui.create_an_account', `Create an account`)}</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
