import {BrowserRouter,Navigate,Route,Routes,useLocation,useParams} from "react-router-dom";
import {lazy,Suspense} from "react";
import ProtectedRoute from "../auth/ProtectedRoute";
import UserLayout from "../layouts/UserLayout";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/Dashboard";
import MyForms from "../pages/MyForms";
import Profile from "../pages/Profile";
import ResponsesOverview from "../pages/ResponsesOverview";
import CreateForm from "../pages/CreateForm";
import FormBuilder from "../pages/FormBuilder";
import FormPreview from "../pages/FormPreview";
import PublicForm from "../pages/PublicForm";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Responses from "../pages/Responses";
import ResponseDetail from "../pages/ResponseDetail";
const AdminDashboard=lazy(()=>import("../pages/AdminDashboard"));
const AdminUsers=lazy(()=>import("../pages/AdminUsers"));
const AdminForms=lazy(()=>import("../pages/AdminForms"));
const AdminAnalytics=lazy(()=>import("../pages/AdminAnalytics"));

const lazyPage=(Component)=><Suspense fallback={<main className="page-shell admin-page"><div className="skeleton chart-skeleton"/></main>}><Component/></Suspense>;

function LegacyResponsesRedirect(){
  const {formId}=useParams();
  const location=useLocation();
  return <Navigate to={`/responses/forms/${formId}${location.search}`} replace/>;
}

function LegacyResponseDetailRedirect(){
  const {formId,responseId}=useParams();
  const location=useLocation();
  return <Navigate to={`/responses/forms/${formId}/${responseId}${location.search}`} replace/>;
}

export default function AppRoutes(){return <BrowserRouter><Routes><Route path="/login" element={<Login/>}/><Route path="/admin/login" element={<Login admin/>}/><Route path="/register" element={<Register/>}/><Route path="/f/:linkToken" element={<PublicForm/>}/><Route element={<ProtectedRoute/>}><Route element={<UserLayout/>}><Route path="/dashboard" element={<Dashboard/>}/><Route path="/forms" element={<MyForms/>}/><Route path="/my-forms" element={<Navigate to="/forms" replace/>}/><Route path="/responses" element={<ResponsesOverview/>}/><Route path="/responses/forms/:formId" element={<Responses/>}/><Route path="/responses/forms/:formId/:responseId" element={<ResponseDetail/>}/><Route path="/profile" element={<Profile/>}/><Route path="/create-form" element={<CreateForm/>}/><Route path="/forms/:formId/builder" element={<FormBuilder/>}/><Route path="/forms/:formId/preview" element={<FormPreview/>}/><Route path="/forms/:formId/responses" element={<LegacyResponsesRedirect/>}/><Route path="/forms/:formId/responses/:responseId" element={<LegacyResponseDetailRedirect/>}/></Route></Route><Route element={<ProtectedRoute admin/>}><Route element={<AdminLayout/>}><Route path="/admin/dashboard" element={lazyPage(AdminDashboard)}/><Route path="/admin/users" element={lazyPage(AdminUsers)}/><Route path="/admin/forms" element={lazyPage(AdminForms)}/><Route path="/admin/analytics" element={lazyPage(AdminAnalytics)}/><Route path="/admin/activity" element={<Navigate to="/admin/analytics#activity" replace/>}/></Route></Route><Route path="/admin" element={<Navigate to="/admin/dashboard" replace/>}/><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
