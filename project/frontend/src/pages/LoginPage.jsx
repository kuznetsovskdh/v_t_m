import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../api/client.js";
import { Button } from "../components/ui/button.jsx";
import { Card, CardHeader, CardTitle } from "../components/ui/card.jsx";

export default function LoginPage({ token, onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("judge1");
  const [password, setPassword] = useState("1111");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) navigate("/voting", { replace: true });
  }, [token, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const accessToken = await login(username, password);
      localStorage.setItem("token", accessToken);
      onLogin(accessToken);
      navigate("/voting", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Вход в систему</CardTitle>
          </CardHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-900">Логин</div>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-slate-900">Пароль</div>
              <input
                type="password"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Проверяем..." : "Войти"}
            </Button>

          </form>
        </Card>
      </div>
    </div>
  );
}

