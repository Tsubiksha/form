import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Wrench, Inbox, Download,
  ScrollText, Settings, LogOut, Bell, Search,
  ChevronLeft, ChevronRight, Menu, CheckCircle2,
  FileCheck, DownloadCloud, AlertCircle, Trash2, Check, Sun, Moon, BarChart2, User
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../components/ThemeProvider";
import { useAuth } from "../auth/AuthContext";
import API from "../services/api";
import { relativeTime } from "../utils/relativeTime";

const navGroups = [
  {
    label: "Workspace",
    links: [
      { icon: LayoutDashboard, label: "Dashboard",  to: "/workspace/home", key: "dashboard" },
      { icon: FileText,        label: "Forms",       to: "/workspace/forms", key: "forms" },
      { icon: Wrench,          label: "Builder",     to: "/workspace/forms", builderAlias: true, key: "builder" },
      { icon: Inbox,           label: "Responses",   to: "/workspace/responses", key: "responses" },
      { icon: BarChart2,       label: "Analytics",   to: "/workspace/analytics", key: "analytics" },
    ]
  },
  {
    label: "Data",
    links: [
      { icon: Download, label: "Exports", to: "/workspace/exports", key: "exports" },
    ]
  }
];

const adminLinks = [
  { icon: ScrollText, label: "Audit Logs", to: "/workspace/audit", key: "audit" },
];

const bottomLinks = [
  { icon: Settings, label: "Settings", to: "/workspace/settings", key: "settings" },
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: "submission", title: "New Submission Received", message: "Customer Satisfaction Survey received a new response.", timestamp: "10m ago", read: false, icon: Inbox },
  { id: 2, type: "publish", title: "Form Published", message: "Feedback Form v2.0 is live and accepting responses.", timestamp: "1h ago", read: false, icon: FileCheck },
  { id: 3, type: "export", title: "Export Completed", message: "CSV export for 'Employee Onboarding' is ready for download.", timestamp: "3h ago", read: true, icon: DownloadCloud },
];

export default function WorkspaceLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    API.get("/dashboard/me").then(res => {
      const data = res.data;
      const notifs = [];
      let idCounter = 1;
      
      // Submissions
      if (data.recent_responses) {
        data.recent_responses.forEach(r => {
          notifs.push({
            id: idCounter++,
            type: "submission",
            title: "Submission Received",
            message: `New response received for ${r.form_title}.`,
            timestamp: relativeTime(r.submitted_at),
            rawDate: new Date(r.submitted_at),
            read: false,
            icon: Inbox
          });
        });
      }
      
      // Published forms
      if (data.published_forms_list) {
        data.published_forms_list.forEach(f => {
          notifs.push({
            id: idCounter++,
            type: "publish",
            title: "Form Published",
            message: `Form '${f.title}' is live.`,
            timestamp: relativeTime(f.published_at),
            rawDate: new Date(f.published_at),
            read: false,
            icon: FileCheck
          });
        });
      }
      
      // Sort descending
      notifs.sort((a, b) => b.rawDate - a.rawDate);
      
      setNotifications(notifs.length ? notifs : INITIAL_NOTIFICATIONS);
    }).catch(() => {
      setNotifications(INITIAL_NOTIFICATIONS);
    });

    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Force Dashboard to be in English
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [i18n]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markSingleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isActive = (to, builderAlias) => {
    if (builderAlias) {
      return location.pathname.includes("/builder");
    }
    if (to === "/workspace/home") return location.pathname === "/workspace/home";
    if (to === "/workspace/forms") {
      return location.pathname.startsWith("/workspace/forms") && !location.pathname.includes("/builder");
    }
    return location.pathname.startsWith(to);
  };

  const pageTitle = (() => {
    const path = location.pathname;
    if (path === "/workspace/home") return "Dashboard";
    if (path.includes("/builder")) return "Form Builder";
    if (path.includes("/forms") && path.includes("/responses")) return "Responses";
    if (path.includes("/forms") && (path.includes("/insights") || path.includes("/analytics"))) return "Analytics";
    if (path.includes("/forms") && path.includes("/preview")) return "Preview";
    if (path.startsWith("/workspace/forms")) return "Forms";
    if (path.startsWith("/workspace/responses")) return "Responses";
    if (path.startsWith("/workspace/exports")) return "Exports";
    if (path.startsWith("/workspace/audit")) return "Audit Logs";
    if (path.startsWith("/workspace/settings")) return "Settings";
    if (path.startsWith("/workspace/create-form")) return "Create Form";
    return "Workspace";
  })();

  const isBuilderPage = location.pathname.includes("/builder");

  const allNavGroups = user?.role === "admin"
    ? [
        ...navGroups,
        { label: "Admin", links: adminLinks }
      ]
    : navGroups;

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const NavItem = ({ icon: Icon, label, to, builderAlias }) => {
    const active = isActive(to, builderAlias);
    return (
      <div
        className={`nav-item ${active ? "active" : ""}`}
        onClick={() => { navigate(to); setMobileOpen(false); }}
        title={collapsed ? label : undefined}
      >
        <Icon size={17} className="nav-icon" />
        {!collapsed && <span className="nav-label">{label}</span>}
      </div>
    );
  };

  return (
    <div className="workspace-app">
      {/* Sidebar */}
      <aside className={`workspace-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">{t('ui.f', `F`)}</div>
          {!collapsed && <span className="sidebar-brand-name">{t('ui.formflow', `FormFlow`)}</span>}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {allNavGroups.map(group => (
            <div key={group.label}>
              {!collapsed && <div className="nav-section-label">{t(`sidebar.group_${group.label.toLowerCase()}`, group.label)}</div>}
              {group.links.map(link => (
                <NavItem key={`${link.to}-${link.label}`} {...link} label={t(`sidebar.${link.key}`, link.label)} />
              ))}
            </div>
          ))}

          {/* Bottom links */}
          <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {bottomLinks.map(link => (
              <NavItem key={link.to} {...link} label={t(`sidebar.${link.key}`, link.label)} />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-avatar">{initials}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || "User"}</div>
              <div className="sidebar-user-role">{user?.role === "admin" ? "Administrator" : "Member"}</div>
            </div>
          )}
          {!collapsed && (
            <button className="sidebar-logout-btn" onClick={signOut} title={t('ui.sign_out', `Sign Out`)}>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Main */}
      <main className="workspace-main">
        {/* Header */}
        <header className="workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ display: 'none' }}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <Menu size={16} />
            </button>
            <div className="header-breadcrumbs">
              <span>{t('ui.workspace', `Workspace`)}</span>
              <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
              <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="header-actions">
            {!isBuilderPage && (
              <div className="header-search">
                <Search size={13} className="header-search-icon" />
                <input type="text" placeholder={t('ui.search', `Search...`)} aria-label="Search" />
              </div>
            )}

            {/* Theme Toggle */}
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Bell with Panel Dropdown */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon"
                aria-label="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                style={{ position: 'relative' }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--danger-500)',
                    border: '2px solid var(--bg-surface)'
                  }} />
                )}
              </button>

              {/* Notification Panel */}
              {notifOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  width: 340,
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-subtle)',
                  zIndex: 200,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-surface-2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('ui.notifications', `Notifications`)}</strong>
                      {unreadCount > 0 && (
                        <span style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                          {unreadCount}{t('ui.new', `new`)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{ border: 'none', background: 'transparent', color: 'var(--brand-600)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Check size={12} />{t('ui.mark_read', `Mark read`)}</button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Trash2 size={12} />{t('ui.clear', `Clear`)}</button>
                      )}
                    </div>
                  </div>

                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {notifications.length > 0 ? (
                      notifications.map(n => {
                        const Icon = n.icon;
                        return (
                          <div
                            key={n.id}
                            onClick={() => markSingleRead(n.id)}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: n.read ? 'var(--bg-surface)' : 'var(--bg-sidebar-active)',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: 12,
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: n.read ? 'var(--gray-100)' : 'var(--brand-100)',
                              color: n.read ? 'var(--text-secondary)' : 'var(--brand-600)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Icon size={16} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <strong style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{n.title}</strong>
                                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{n.timestamp}</span>
                              </div>
                              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>{n.message}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <Bell size={28} style={{ opacity: 0.4, margin: '0 auto 8px auto', display: 'block' }} />
                        <span style={{ fontSize: 13, fontWeight: 500, display: 'block' }}>{t('ui.no_notifications', `No notifications`)}</span>
                        <small style={{ fontSize: 11 }}>{t('ui.you_re_all_caught_up', `You're all caught up!`)}</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>



            <div
              className="sidebar-user-avatar"
              style={{ width: 30, height: 30, cursor: 'pointer' }}
              onClick={() => navigate("/workspace/settings")}
              title={t('ui.settings', `Settings`)}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className={`workspace-viewport ${isBuilderPage ? "flush" : ""}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

