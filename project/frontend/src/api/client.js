function normalizeBaseUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`,
);

async function parseError(res) {
  try {
    const data = await res.json();
    if (data && typeof data.detail === "string") return data.detail;
    if (data && typeof data.message === "string") return data.message;
    return JSON.stringify(data);
  } catch {
    const text = await res.text();
    return text || `Request failed with ${res.status}`;
  }
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.access_token;
}

export async function getMe(token) {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getActiveProject(token) {
  const res = await fetch(`${API_BASE_URL}/api/projects/active`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getProjects(token) {
  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function postVotes(token, votes) {
  const res = await fetch(`${API_BASE_URL}/api/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(votes),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function postVotesForProject(token, projectId, votes) {
  const res = await fetch(`${API_BASE_URL}/api/votes/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(votes),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getVotes(token, projectId) {
  const res = await fetch(`${API_BASE_URL}/api/votes/${projectId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getVotesStatus(token, projectId) {
  const res = await fetch(`${API_BASE_URL}/api/votes/${projectId}/status`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function getVotesExportUrl() {
  return `${API_BASE_URL}/api/pipeline/votes/export.xlsx`;
}

export async function importProjectsXlsx(token, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/pipeline/projects/import`, {
    method: "POST",
    headers: { ...authHeader(token) },
    body: form,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

