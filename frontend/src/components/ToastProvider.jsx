import {createContext,useCallback,useContext,useMemo,useState} from "react";
const ToastContext=createContext(null);
export function ToastProvider({children}){const [toasts,setToasts]=useState([]);const show=useCallback((message,type="success")=>{const id=Date.now()+Math.random();setToasts(items=>[...items,{id,message,type}]);setTimeout(()=>setToasts(items=>items.filter(item=>item.id!==id)),3500)},[]);const value=useMemo(()=>({success:m=>show(m,"success"),error:m=>show(m,"error")}),[show]);return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{toasts.map(t=><div className={`toast ${t.type}`} key={t.id}>{t.message}</div>)}</div></ToastContext.Provider>}
// eslint-disable-next-line react-refresh/only-export-components
export const useToast=()=>useContext(ToastContext);
