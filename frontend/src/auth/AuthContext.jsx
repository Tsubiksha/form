import { createContext, useContext, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const AuthContext=createContext(null);
export function AuthProvider({children}) {
  const [user,setUser]=useState(null); const [loading,setLoading]=useState(!!sessionStorage.getItem("access_token"));
  useEffect(()=>{ const expired=()=>{setUser(null);setLoading(false)}; window.addEventListener("auth:expired",expired);
    if(sessionStorage.getItem("access_token")) API.get("/auth/me").then(r=>setUser(r.data)).catch(()=>setUser(null)).finally(()=>setLoading(false));
    return()=>window.removeEventListener("auth:expired",expired)},[]);
  const authenticate=async(path,payload)=>{const {data}=await API.post(path,payload);sessionStorage.setItem("access_token",data.access_token);sessionStorage.setItem("refresh_token",data.refresh_token);setUser(data.user);return data.user};
  const logout=async()=>{try{await API.post("/auth/logout",{refresh_token:sessionStorage.getItem("refresh_token")})}finally{sessionStorage.clear();setUser(null)}};
  const refreshUser=async()=>{const {data}=await API.get("/auth/me");setUser(data);return data};
  const value=useMemo(()=>({user,loading,login:(p)=>authenticate("/auth/login",p),register:(p)=>authenticate("/auth/register",p),logout,refreshUser}),[user,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
// AuthProvider and its colocated hook form one public authentication module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth=()=>useContext(AuthContext);
