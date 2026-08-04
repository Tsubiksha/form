import { useTranslation } from "react-i18next";
import {Navigate,Outlet,useLocation} from "react-router-dom";import {useAuth} from "./AuthContext";
export default function ProtectedRoute({admin=false}){
  const { t } = useTranslation();const {user,loading}=useAuth();const location=useLocation();if(loading)return <main className="page-shell"><div className="card empty-state">{t('ui.checking_your_session', `Checking your session…`)}</div></main>;if(!user)return <Navigate to={admin?"/admin/login":"/login"} replace state={{from:location}}/>;const isAdmin=user.role==="ADMIN";if(admin&&!isAdmin)return <Navigate to="/dashboard" replace/>;return <Outlet/>}
