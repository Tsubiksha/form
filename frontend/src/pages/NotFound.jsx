import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function NotFound() {
  const { t } = useTranslation();
  const { user } = useAuth() || {};
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-surface)', padding: '24px'
    }}>
      <div style={{
        textAlign: 'center', maxWidth: 480,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))',
          borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8
        }}>{t('ui.f', `F`)}</div>

        {/* 404 */}
        <div style={{
          fontSize: 96, fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em'
        }}>404</div>

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{t('ui.page_not_found', `Page Not Found`)}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{t('ui.the_page_you_re_looking_for_doesn_t_exis', `The page you're looking for doesn't exist or may have been moved.`)}</p>
        </div>

        <Link
          to={user ? "/workspace/home" : "/login"}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 44, padding: '0 24px',
            background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))',
            color: 'white', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(124,58,237,0.35)'
          }}
        >
          {user ? "Go to Dashboard" : "Sign In"}
        </Link>
      </div>
    </div>
  );
}
