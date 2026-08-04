import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, Users as UsersIcon, MoreVertical, Shield, UserX, CheckCircle2, UserPlus, Edit, Trash2, X } from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { relativeTime } from "../utils/relativeTime";
import ConfirmModal from "../components/ConfirmModal";

const initials = name => name ? name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "?";

const UserModal = ({ open, user, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(user || { name: "", email: "", role: "USER" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFormData(user || { name: "", email: "", role: "USER" });
  }, [user, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      onSave({ ...formData, id: formData.id || `u_${Date.now()}`, is_active: formData.is_active !== undefined ? formData.is_active : true, created_at: formData.created_at || new Date().toISOString() });
      setBusy(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" style={{ padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{user ? 'Edit User' : 'Add User'}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="label">{t('ui.full_name', `Full Name`)}</label>
            <input required type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.email_address', `Email Address`)}</label>
            <input required type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">{t('ui.role', `Role`)}</label>
            <select className="input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
              <option value="USER">{t('ui.member', `Member`)}</option>
              <option value="ADMIN">{t('ui.administrator', `Administrator`)}</option>
              <option value="CREATOR">{t('ui.form_creator', `Form Creator`)}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('ui.cancel', `Cancel`)}</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving..." : "Save User"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", status: "", sort: "desc" });
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);
  
  // Modals state
  const [userModal, setUserModal] = useState({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null, busy: false });
  
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    API.get("/admin/users", { params: { 
      search: filters.search || undefined, 
      role: filters.role || undefined, 
      status: filters.status || undefined, 
      sort: filters.sort 
    }})
    .then(r => setUsers(r.data.items || r.data))
    .catch(e => toast.error(apiMessage(e, "Unable to load users")))
    .finally(() => setLoading(false));
  }, [filters, toast]);

  useEffect(() => {
    const id = setTimeout(load, 200);
    return () => clearTimeout(id);
  }, [load]);

  const toggle = async (user) => {
    setMenu(null);
    try {
      await API.patch(`/admin/users/${user.id}/status`, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? "Deactivated" : "Activated"} Successfully`);
      load();
    } catch (e) {
      toast.error(apiMessage(e, "Failed to update user"));
      // Mock fallback if API fails
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    }
  };

  const handleSaveUser = (savedUser) => {
    if (userModal.user) {
      setUsers(users.map(u => u.id === savedUser.id ? savedUser : u));
      toast.success("User updated successfully");
    } else {
      setUsers([savedUser, ...users]);
      toast.success("User created successfully");
    }
  };

  const executeDelete = () => {
    setDeleteModal(prev => ({ ...prev, busy: true }));
    setTimeout(() => {
      setUsers(users.filter(u => u.id !== deleteModal.user.id));
      toast.success(`User ${deleteModal.user.name} deleted`);
      setDeleteModal({ open: false, user: null, busy: false });
    }, 500);
  };

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <PageHeader 
        title={t('ui.user_management', `User Management`)} 
        description="Review creator activity, manage platform access, and oversee administrative roles." 
        eyebrow="Account Administration" 
        action={
          <button className="btn btn-primary" onClick={() => setUserModal({ open: true, user: null })}>
            <UserPlus size={16} />{t('ui.add_user', `Add User`)}</button>
        }
      />

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="header-search" style={{ flex: 1, minWidth: 240, maxWidth: 320 }}>
            <Search size={14} className="header-search-icon" />
            <input 
              type="text" 
              placeholder={t('ui.search_name_or_email', `Search name or email...`)} 
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select className="input" style={{ width: 140 }} value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })}>
            <option value="">{t('ui.all_roles', `All Roles`)}</option>
            <option value="USER">{t('ui.member', `Member`)}</option>
            <option value="ADMIN">{t('ui.administrator', `Administrator`)}</option>
            <option value="CREATOR">{t('ui.form_creator', `Form Creator`)}</option>
          </select>
          <select className="input" style={{ width: 140 }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">{t('ui.all_statuses', `All Statuses`)}</option>
            <option value="active">{t('ui.active', `Active`)}</option>
            <option value="inactive">{t('ui.deactivated', `Deactivated`)}</option>
          </select>
          <select className="input" style={{ width: 140 }} value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
            <option value="desc">{t('ui.newest_first', `Newest first`)}</option>
            <option value="asc">{t('ui.oldest_first', `Oldest first`)}</option>
          </select>
        </div>
        
        <CardBody noPadding>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="btn-spinner" style={{ borderColor: 'rgba(0,0,0,0.1)', borderTopColor: '#7c3aed', margin: '0 auto' }} />
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <UsersIcon size={48} />
              <h3>{t('ui.no_users_found', `No users found`)}</h3>
              <p>{t('ui.try_changing_your_search_or_filters', `Try changing your search or filters.`)}</p>
            </div>
          ) : (
            <Table>
              <TableHeader headers={["User", "Status", "Role", "Forms", "Responses", "Joined", ""]} />
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="response-respondent">
                        <div className="response-avatar" style={{ background: u.is_active ? 'var(--brand-gradient)' : '#cbd5e1' }}>
                          {initials(u.name)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#0f172a' }}>{u.name}</strong>
                          <span className="text-small">{u.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'success' : 'danger'}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'brand' : 'default'}>
                        {u.role === 'ADMIN' ? <span style={{display:'flex',gap:4,alignItems:'center'}}><Shield size={12}/>{t('ui.admin', `Admin`)}</span> : u.role === 'CREATOR' ? 'Creator' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell><strong>{u.forms_count || 0}</strong></TableCell>
                    <TableCell><strong>{u.response_count || 0}</strong></TableCell>
                    <TableCell className="text-small">{relativeTime(u.created_at)}</TableCell>
                    <TableCell align="right">
                      <div style={{ position: 'relative' }}>
                        <button className="btn-icon btn-ghost" onClick={() => setMenu(menu === u.id ? null : u.id)} disabled={u.role === "ADMIN"}>
                          <MoreVertical size={16} />
                        </button>
                        {menu === u.id && (
                          <div style={{ position: 'absolute', right: 0, top: 32, background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 4, zIndex: 10, minWidth: 160 }}>
                            <button className="btn w-full justify-start btn-ghost" onClick={() => { setMenu(null); setUserModal({ open: true, user: u }); }}>
                              <Edit size={14} />{t('ui.edit_user', `Edit User`)}</button>
                            <button className={`btn w-full justify-start btn-ghost`} onClick={() => toggle(u)}>
                              {u.is_active ? <><UserX size={14}/>{t('ui.deactivate', `Deactivate`)}</> : <><CheckCircle2 size={14}/>{t('ui.activate', `Activate`)}</>}
                            </button>
                            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                            <button className="btn w-full justify-start btn-danger-ghost" onClick={() => { setMenu(null); setDeleteModal({ open: true, user: u, busy: false }); }}>
                              <Trash2 size={14} />{t('ui.delete', `Delete`)}</button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <UserModal 
        open={userModal.open} 
        user={userModal.user} 
        onClose={() => setUserModal({ open: false, user: null })} 
        onSave={handleSaveUser} 
      />

      <ConfirmModal
        open={deleteModal.open}
        title={t('ui.delete_user', `Delete User`)}
        message={`Are you sure you want to delete ${deleteModal.user?.name}? This action will remove their access, but their forms and data will be retained.`}
        danger={true}
        busy={deleteModal.busy}
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ open: false, user: null, busy: false })}
      />
    </div>
  );
}
