import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/ToastProvider";

function App() {
  return <ToastProvider><AuthProvider><AppRoutes /></AuthProvider></ToastProvider>;
}

export default App;
