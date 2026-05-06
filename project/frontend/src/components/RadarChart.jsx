import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Radar,
  RadarChart as RechartsRadarChart,
} from "recharts";

function judgeKey(userId) {
  return `judge_${userId}`;
}

export default function RadarChart({ votesData }) {
  if (!votesData || !votesData.criteria || !votesData.judges) {
    return null;
  }

  const { criteria, judges } = votesData;
  const maxScore = Math.max(...criteria.map((c) => c.max_score ?? 5), 5);
  const ticks = Array.from({ length: maxScore }, (_, i) => i + 1);

  const data = criteria.map((c) => {
    const row = { category: c.name };
    for (const j of judges) {
      const scoreEntry = j.scores.find((s) => s.criteria_id === c.id);
      row[judgeKey(j.user_id)] = scoreEntry?.score ?? 0;
    }
    return row;
  });

  return (
    <div className="mt-6">
      <div className="h-[320px] w-full sm:h-[380px] lg:h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#CBD5E1" strokeDasharray="2 4" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "#0F172A", fontSize: 12 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxScore]}
              ticks={ticks}
              tick={{ fill: "#64748B", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            {judges.map((j) => (
              <Radar
                key={j.user_id}
                name="Эксперт"
                dataKey={judgeKey(j.user_id)}
                stroke={j.color}
                fill={j.color}
                fillOpacity={0.18}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {judges.map((j) => (
          <div key={j.user_id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: j.color }}
              />
              <div className="text-sm font-semibold text-slate-900">
                Эксперт
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              {criteria.map((c) => {
                const s = j.scores.find((x) => x.criteria_id === c.id)?.score;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <span className="truncate pr-2">{c.name}</span>
                    <span className="font-medium text-slate-900">{s ?? "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

