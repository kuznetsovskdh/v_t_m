import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "../components/ui/button.jsx";
import SliderPanel from "../components/SliderPanel.jsx";
import RadarChart from "../components/RadarChart.jsx";
import useVotingSocket from "../hooks/useVotingSocket.js";
import { getActiveProject, getMe, getProjects, getVotes, getVotesExportUrl, getVotesStatus, importProjectsXlsx, postVotesForProject } from "../api/client.js";

export default function VotingPage({ token }) {
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [importing, setImporting] = useState(false);

  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [me, setMe] = useState(null);

  const [votesData, setVotesData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  const [scoresByCriteria, setScoresByCriteria] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const projectId = project?.id;

  async function loadProjectData(targetProjectId, currentUser) {
    const [votes, status] = await Promise.all([
      getVotes(token, targetProjectId),
      getVotesStatus(token, targetProjectId),
    ]);

    setVotesData(votes);
    setStatusData(status);

    const mine = status?.judges?.find((j) => j.user_id === currentUser.id);
    setHasVoted(Boolean(mine?.has_voted));

    const myJudge = votes?.judges?.find((j) => j.user_id === currentUser.id);
    const initScores = {};
    for (const c of votes?.criteria ?? []) {
      const found = myJudge?.scores?.find((s) => s.criteria_id === c.id);
      initScores[c.id] = found?.score ?? 1;
    }
    setScoresByCriteria(initScores);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const [current, list, activeMaybe] = await Promise.all([
          getMe(token),
          getProjects(token),
          getActiveProject(token).catch(() => null),
        ]);
        if (cancelled) return;
        setMe(current);

        setProjects(list);

        const initial =
          (activeMaybe && list.find((p) => p.id === activeMaybe.id)) ||
          list.find((p) => p.is_active) ||
          list[0] ||
          null;

        if (initial) {
          setProject({ id: initial.id, title: initial.title, description: initial.description });
          await loadProjectData(initial.id, current);
        } else {
          setProject(null);
          setVotesData(null);
          setStatusData(null);
          setScoresByCriteria({});
          setHasVoted(false);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load voting data");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function refreshOnProjectChange() {
      if (!projectId || !me) return;
      setLoading(true);
      setError("");
      setNotification("");
      try {
        await loadProjectData(projectId, me);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Failed to load voting data");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    refreshOnProjectChange();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    // When the project changes, sync sliders from the latest votes.
    if (!votesData || !me) return;
    const myJudge = votesData.judges.find((j) => j.user_id === me.id);
    if (!myJudge) return;
    setScoresByCriteria((prev) => {
      const next = { ...prev };
      for (const s of myJudge.scores) {
        next[s.criteria_id] = s.score ?? 1;
      }
      return next;
    });
  }, [votesData, me]);

  const criteria = useMemo(() => votesData?.criteria ?? [], [votesData]);
  const maxTotal = useMemo(() => criteria.reduce((sum, c) => sum + (c.max_score ?? 5), 0), [criteria]);
  const total = useMemo(() => criteria.reduce((sum, c) => sum + (scoresByCriteria[c.id] ?? 0), 0), [criteria, scoresByCriteria]);

  const allJuryVoted = useMemo(() => {
    const judges = statusData?.judges ?? [];
    return judges.length > 0 && judges.every((j) => j.has_voted);
  }, [statusData]);

  const votesProgress = useMemo(() => {
    const judges = statusData?.judges ?? [];
    const total = judges.length;
    const voted = judges.reduce((acc, j) => acc + (j.has_voted ? 1 : 0), 0);
    return { voted, total };
  }, [statusData]);

  const итогScore = useMemo(() => {
    if (!votesData) return null;
    const votedJudgeIds = new Set((statusData?.judges ?? []).filter((j) => j.has_voted).map((j) => j.user_id));
    const votedJudges = (votesData.judges ?? []).filter((j) => votedJudgeIds.has(j.user_id));
    if (!votedJudges.length) return null;
    let sum = 0;
    for (const c of criteria) {
      let s = 0;
      for (const j of votedJudges) {
        const found = j.scores?.find((x) => x.criteria_id === c.id);
        s += Number(found?.score ?? 0);
      }
      sum += s / votedJudges.length;
    }
    return sum;
  }, [votesData, statusData, criteria]);

  async function downloadExcel() {
    setError("");
    try {
      const res = await fetch(getVotesExportUrl(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "votes_export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || "Export failed");
    }
  }

  async function onSubmitVotes(e) {
    e.preventDefault();
    setError("");
    if (!projectId) return;
    try {
      const payload = criteria.map((c) => ({
        criteria_id: c.id,
        score: scoresByCriteria[c.id] ?? 1,
      }));

      await postVotesForProject(token, projectId, payload);

      // Refresh once immediately; websocket should also keep it in sync.
      const [votes, status] = await Promise.all([
        getVotes(token, projectId),
        getVotesStatus(token, projectId),
      ]);
      setVotesData(votes);
      setStatusData(status);
      const mine = status.judges.find((j) => j.user_id === me?.id);
      setHasVoted(Boolean(mine?.has_voted));
    } catch (err) {
      setError(err?.message || "Failed to submit votes");
    }
  }

  useVotingSocket({
    projectId,
    token,
    onVoteSubmitted: async () => {
      if (!projectId) return;
      try {
        const [votes, status] = await Promise.all([
          getVotes(token, projectId),
          getVotesStatus(token, projectId),
        ]);
        setVotesData(votes);
        setStatusData(status);
        if (me?.id) {
          const mine = status.judges.find((j) => j.user_id === me.id);
          setHasVoted(Boolean(mine?.has_voted));
        }
      } catch {
        // ignore transient websocket refresh failures
      }
    },
    onVotingComplete: ({ project_id }) => {
      if (project_id === projectId) {
        setNotification("Все жюри проголосовали! Результаты сохранены.");
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 pb-28 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {me ? (
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-800">
              Вы авторизованы как <span className="font-medium">{me.display_name}</span>
            </div>
          ) : (
            <div />
          )}
        </div>

        {notification ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {notification}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1">
              {projects.length ? (
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="text-sm font-medium text-slate-900">Инициатива</div>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:max-w-[520px]"
                    value={projectId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const selected = projects.find((p) => p.id === id);
                      if (!selected) return;
                      setProject({ id: selected.id, title: selected.title, description: selected.description });
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title.length > 90 ? `${p.title.slice(0, 90)}…` : p.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {project?.title ?? "Загрузка..."}
              </h1>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 sm:text-base">{project?.description ?? ""}</p>
            </div>
            <div className="text-left lg:text-right">
              <div className="text-sm text-slate-500">Итог</div>
              <div className="text-xl font-semibold text-slate-900">
                {итогScore == null ? "—" : Number.isInteger(итогScore) ? итогScore : итогScore.toFixed(1)} / {maxTotal} баллов
              </div>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="text-sm font-medium text-slate-900">Статус проголосовавших</div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              {votesProgress.voted === votesProgress.total && votesProgress.total > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400" />
              )}
              <div className="text-sm text-slate-800">
                Проголосовали: <span className="font-medium">{votesProgress.voted}</span> / {votesProgress.total}
              </div>
            </div>
          </div>

        </div>

        <form onSubmit={onSubmitVotes} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-4">
            {criteria.map((c) => (
              <SliderPanel
                key={c.id}
                criterion={c}
                value={scoresByCriteria[c.id] ?? 1}
                disabled={false}
                onChange={(v) => setScoresByCriteria((prev) => ({ ...prev, [c.id]: v }))}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600 sm:max-w-[70%]">
              {hasVoted ? "Вы уже голосовали за эту инициативу — можно отправить новую оценку." : "Заполните оценки и отправьте голосование."}
            </div>
            <Button type="submit" disabled={loading || !projectId} className="w-full sm:w-auto">
              {hasVoted ? "Отправить снова" : "Проголосовать"}
            </Button>
          </div>
        </form>

        <RadarChart votesData={votesData} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-4">
          <label className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 sm:w-auto sm:justify-start">
            <span className="whitespace-nowrap">Импорт инициатив (XLSX)</span>
            <input
              type="file"
              accept=".xlsx"
              disabled={!me || importing}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setError("");
                setImporting(true);
                try {
                  await importProjectsXlsx(token, f);
                  const list = await getProjects(token);
                  setProjects(list);
                  if (!projectId && list.length) {
                    const first = list[0];
                    setProject({ id: first.id, title: first.title, description: first.description });
                  }
                } catch (err) {
                  setError(err?.message || "Import failed");
                } finally {
                  setImporting(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
          <Button type="button" onClick={downloadExcel} disabled={!me} className="w-full sm:w-auto">
            Скачать Excel
          </Button>
        </div>
      </div>
    </div>
  );
}

