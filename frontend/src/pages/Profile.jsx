import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {CalendarDays,Eye,EyeOff,LogOut,Mail,ShieldCheck,User,UserRoundCog} from "lucide-react";
import API from "../services/api";
import {useAuth} from "../auth/AuthContext";
import {useToast} from "../components/ToastProvider";
import {apiMessage,validEmail,validPassword} from "../utils/errors";

function PasswordField({label,value,onChange,autoComplete}) {
  const [show,setShow]=useState(false);
  return <label>{label}<div className="password-input-wrap"><input type={show?"text":"password"} value={value} onChange={onChange} autoComplete={autoComplete}/><button type="button" onClick={()=>setShow(!show)} aria-label={`${show?"Hide":"Show"} ${label}`}>{show?<EyeOff/>:<Eye/>}</button></div></label>;
}

export default function Profile(){
  const {user,refreshUser,logout}=useAuth();
  const [profile,setProfile]=useState({name:user.name,email:user.email});
  const [passwords,setPasswords]=useState({current_password:"",new_password:"",confirm_password:""});
  const [busy,setBusy]=useState("");
  const toast=useToast();
  const navigate=useNavigate();
  const save=async event=>{
    event.preventDefault();
    if(profile.name.trim().length<2)return toast.error("Full name is required.");
    if(!validEmail(profile.email))return toast.error("Enter a valid email address.");
    setBusy("profile");
    try{await API.patch("/auth/me",{name:profile.name.trim(),email:profile.email.trim()});await refreshUser();toast.success("Personal information updated")}
    catch(error){toast.error(apiMessage(error,error.response?.status===409?"This email is already in use.":"Failed to update profile"))}
    finally{setBusy("")}
  };
  const change=async event=>{
    event.preventDefault();
    if(!passwords.current_password)return toast.error("Enter your current password.");
    if(!validPassword(passwords.new_password))return toast.error("New password must be 6–72 characters using letters and numbers only.");
    if(passwords.new_password!==passwords.confirm_password)return toast.error("New password and confirm password must match.");
    setBusy("password");
    try{await API.post("/auth/change-password",{current_password:passwords.current_password,new_password:passwords.new_password});toast.success("Password updated successfully");setPasswords({current_password:"",new_password:"",confirm_password:""})}
    catch(error){toast.error(apiMessage(error,"Failed to update password"))}
    finally{setBusy("")}
  };
  const signOut=async()=>{await logout();navigate("/login",{replace:true})};
  const initials=user.name.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase();
  return <main className="page-shell profile-page">
    <header className="profile-hero"><span className="profile-avatar">{initials}</span><div><span className="eyebrow">Account settings</span><h1>{user.name}</h1><p>Manage your identity, security, and account preferences.</p></div></header>
    <div className="profile-card-grid">
      <section className="profile-card personal-card"><div className="profile-card-heading"><span><User/></span><div><h2>Personal Information</h2><p>Update how your account appears across FormFlow.</p></div></div><form className="profile-form" onSubmit={save}><label>Full Name<input value={profile.name} onChange={event=>setProfile({...profile,name:event.target.value})} autoComplete="name"/></label><label>Email Address<input type="email" value={profile.email} onChange={event=>setProfile({...profile,email:event.target.value})} autoComplete="email"/></label><button className="button primary" disabled={!!busy}>{busy==="profile"?"Saving...":"Save Changes"}</button></form></section>
      <section className="profile-card security-card"><div className="profile-card-heading"><span><ShieldCheck/></span><div><h2>Security</h2><p>Use a strong password you do not reuse elsewhere.</p></div></div><form className="profile-form" onSubmit={change}><PasswordField label="Current Password" value={passwords.current_password} autoComplete="current-password" onChange={event=>setPasswords({...passwords,current_password:event.target.value})}/><div className="profile-form-row"><PasswordField label="New Password" value={passwords.new_password} autoComplete="new-password" onChange={event=>setPasswords({...passwords,new_password:event.target.value.replace(/[^A-Za-z0-9]/g,"")})}/><PasswordField label="Confirm Password" value={passwords.confirm_password} autoComplete="new-password" onChange={event=>setPasswords({...passwords,confirm_password:event.target.value.replace(/[^A-Za-z0-9]/g,"")})}/></div><small>Minimum 6 characters using letters and numbers only.</small><button className="button secondary" disabled={!!busy}>{busy==="password"?"Updating...":"Update Password"}</button></form></section>
      <section className="profile-card account-card"><div className="profile-card-heading"><span><UserRoundCog/></span><div><h2>Account Information</h2><p>Core details associated with your account.</p></div></div><dl className="account-info-list"><div><span><User/></span><dt>Role</dt><dd>{user.role==="USER"?"Form Creator":"Administrator"}</dd></div><div><span><CalendarDays/></span><dt>Account Created</dt><dd>{new Date(user.created_at).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}</dd></div><div><span><Mail/></span><dt>Last Login</dt><dd>{user.last_login_at?new Date(user.last_login_at).toLocaleString():"Current session"}</dd></div></dl></section>
      <section className="profile-card danger-card"><div className="profile-card-heading"><span><LogOut/></span><div><h2>Danger Zone</h2><p>End your current session on this device.</p></div></div><div className="danger-action"><div><strong>Sign out of FormFlow</strong><p>You will need your email and password to return.</p></div><button className="button danger-button" onClick={signOut}><LogOut/> Logout</button></div></section>
    </div>
  </main>;
}
