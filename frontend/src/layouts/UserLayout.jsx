import {NavLink,Outlet,useNavigate} from "react-router-dom";
import {BarChart3,FileText,LayoutDashboard,LogOut,User} from "lucide-react";
import {useAuth} from "../auth/AuthContext";

const links = [
  [LayoutDashboard, "Dashboard", "/dashboard"],
  [FileText, "Forms", "/forms"],
  [BarChart3, "Responses", "/responses"],
  [User, "Profile", "/profile"],
];

export default function UserLayout(){
  const {user,logout}=useAuth();
  const navigate=useNavigate();
  const signOut=async()=>{await logout();navigate("/login",{replace:true})};
  const initials=user?.name?.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase();
  return <div className="app-layout"><aside className="sidebar user-sidebar"><div className="sidebar-brand"><span className="brand-mark">F</span><span>FormFlow</span></div><nav aria-label="Primary navigation">{links.map(([Icon,label,to])=><NavLink to={to} key={to}><span className="sidebar-nav-icon" aria-hidden="true"><Icon/></span><span>{label}</span></NavLink>)}</nav><div className="sidebar-user"><span className="user-avatar" aria-hidden="true">{initials||"U"}</span><strong>{user?.name}</strong><button onClick={signOut}><LogOut aria-hidden="true"/><span>Logout</span></button></div></aside><div className="layout-main"><Outlet/></div></div>
}
