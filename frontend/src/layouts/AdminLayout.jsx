import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, ClipboardList,
  LogOut, ChevronLeft, ChevronRight, Menu, Bell,
  GitMerge, CheckSquare, Inbox, Settings, ChevronDown, User, Sun, Moon, BarChart2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../components/ThemeProvider";
import { useAuth } from "../auth/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { useToast } from "../components/ToastProvider";

const links = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/admin/dashboard", key: "dashboard" },
  { icon: Users, label: "Users", to: "/admin/users", key: "users" },
  { icon: FileText, label: "Forms", to: "/admin/forms", key: "forms" },
  { icon: BarChart2, label: "Analytics", to: "/admin/analytics", key: "analytics" },
  { icon: CheckSquare, label: "Rules & Validation", to: "/admin/rules", key: "rules" },
  { icon: ClipboardList, label: "Audit Log", to: "/admin/audit", key: "audit" },
  { icon: Settings, label: "Settings", to: "/admin/settings", key: "settings" },
];

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Dropdown states
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Form Submission', message: 'Employee Onboarding received a new entry.', time: '10m ago' },
    { id: 2, title: 'Workflow Alert', message: 'Expense Approval workflow is experiencing delays.', time: '1h ago' }
  ]);
  const profileRef = useRef();
  const notifRef = useRef();
  
  const toast = useToast();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    // Force Dashboard to be in English
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [i18n]);

  const signOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "PO";

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/admin/dashboard") return "Admin Dashboard";
    if (path.startsWith("/admin/users")) return "Users Management";
    if (path.startsWith("/admin/forms")) return "Forms Moderation";
    if (path.startsWith("/admin/analytics")) return "Platform Analytics";
    if (path.startsWith("/admin/workflows")) return "Workflow Monitoring";
    if (path.startsWith("/admin/rules")) return "Rules & Validation";
    if (path.startsWith("/admin/submissions")) return "Global Submissions";
    if (path.startsWith("/admin/audit")) return "Audit Log";
    if (path.startsWith("/admin/settings")) return "System Settings";
    return "Control Center";
  })();

  const NavItem = ({ icon: Icon, label, to, subItems }) => {
    const active = location.pathname === to || (to !== "/admin/dashboard" && location.pathname.startsWith(to.split('?')[0]));
    const [expanded, setExpanded] = useState(active);

    if (subItems && !collapsed) {
      return (
        <div style={{ marginBottom: 4 }}>
          <div
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => setExpanded(!expanded)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon size={17} className="nav-icon" />
              <span className="nav-label">{label}</span>
            </div>
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }} />
          </div>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 40, marginTop: 4, gap: 4 }}>
              {subItems.map(sub => {
                const subActive = location.pathname + location.search === sub.to;
                return (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 6,
                      textDecoration: 'none',
                      color: subActive ? 'white' : 'var(--gray-400)',
                      background: subActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => !subActive && (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => !subActive && (e.currentTarget.style.color = 'var(--gray-400)')}
                  >
                    {sub.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={to}
        className={`nav-item ${active ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? label : undefined}
        style={{ textDecoration: 'none' }}
      >
        <Icon size={17} className="nav-icon" />
        {!collapsed && <span className="nav-label">{label}</span>}
      </NavLink>
    );
  };

  return (
    <div className="workspace-app">
      {/* Sidebar (reusing workspace-sidebar styles for consistency) */}
      <aside className={`workspace-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">{t('ui.f', `F`)}</div>
          {!collapsed && <span className="sidebar-brand-name">{t('ui.control_center', `Control Center`)}</span>}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div>
            {!collapsed && <div className="nav-section-label">{t('sidebar.administration', 'Administration')}</div>}
            {links.map(link => (
              <NavItem key={link.to} {...link} label={t(`sidebar.${link.key}`, link.label)} />
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || "Platform Owner"}</div>
              <div className="sidebar-user-role">{t('ui.administrator', `Administrator`)}</div>
            </div>
          )}
          {!collapsed && (
            <button className="sidebar-logout-btn" onClick={signOut} title={t('ui.sign_out', `Sign Out`)}>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Main content area */}
      <main className="workspace-main">
        <header className="workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={16} />
            </button>
            <div className="header-breadcrumbs">
              <span>{t('ui.admin', `Admin`)}</span>
              <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
              <strong>{pageTitle}</strong>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button 
                className={`btn btn-icon ${showNotifs ? 'btn-secondary' : 'btn-ghost'}`} 
                aria-label="Alerts" 
                onClick={() => setShowNotifs(!showNotifs)}
              >
                <Bell size={16} />
                {notifications.length > 0 && <span style={{ position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-600)' }} />}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', right: 0, top: 44, width: 320, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('ui.notifications', `Notifications`)}</h3>
                    {notifications.length > 0 && (
                      <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--brand-600)', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => setNotifications([])}>{t('ui.mark_all_as_read', `Mark all as read`)}</button>
                    )}
                  </div>
                  {notifications.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, overflowY: 'auto' }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{n.title}</strong>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{n.time}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{n.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                      <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p>{t('ui.no_new_notifications_at_this_time', `No new notifications at this time.`)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>



            <div style={{ position: 'relative' }} ref={profileRef}>
              <div 
                className="sidebar-user-avatar" 
                style={{ width: 34, height: 34, cursor: 'pointer', border: showProfile ? '2px solid var(--brand-500)' : '2px solid transparent' }}
                onClick={() => setShowProfile(!showProfile)}
              >
                {initials}
              </div>
              {showProfile && (
                <div style={{ position: 'absolute', right: 0, top: 44, width: 220, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 50, padding: 8 }}>
                  <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 8 }}>
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)' }}>{user?.name || "Platform Owner"}</strong>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)' }}>{user?.email || "admin@example.com"}</span>
                  </div>
                  <button className="btn btn-ghost w-full justify-start" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => { setShowProfile(false); navigate('/admin/settings'); }}>
                    <Settings size={14} style={{ marginRight: 8 }} />{t('ui.account_settings', `Account Settings`)}</button>
                  <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />
                  <button className="btn btn-danger-ghost w-full justify-start" style={{ padding: '8px 12px', fontSize: 13 }} onClick={signOut}>
                    <LogOut size={14} style={{ marginRight: 8 }} />{t('ui.sign_out', `Sign Out`)}</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workspace-viewport">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
