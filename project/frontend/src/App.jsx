import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import VotingPage from "./pages/VotingPage.jsx";

function RequireAuth({ token, children }) {
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Keep auth state in sync if token changes in another tab.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const authApi = useMemo(() => ({ token, setToken }), [token]);

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage token={token} onLogin={authApi.setToken} />}
      />

      <Route
        path="/voting"
        element={
          <RequireAuth token={token}>
            <VotingPage token={token} />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to={token ? "/voting" : "/login"} replace />} />
    </Routes>
  );
}

