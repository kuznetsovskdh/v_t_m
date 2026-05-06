export default function SliderPanel({ criterion, value, onChange, disabled = false }) {
  const max = criterion.max_score ?? 5;
  const percent = max > 1 ? ((value - 1) / (max - 1)) * 100 : 0;
  const datalistId = `ticks_${criterion.id ?? criterion.name}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium text-slate-900">{criterion.name}</div>
        <div className="text-sm text-slate-700">{value}</div>
      </div>
      <input
        aria-label={criterion.name}
        type="range"
        min={1}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        list={datalistId}
        style={{
          background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${percent}%, rgb(226 232 240) ${percent}%, rgb(226 232 240) 100%)`,
          transition: "background 120ms ease-out",
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:shadow-sm"
      />

      <datalist id={datalistId}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="flex items-center justify-between px-0.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <div key={n} className="flex flex-col items-center">
            <div className="h-2 w-px bg-slate-300" />
            <div className="mt-1 text-[10px] leading-none text-slate-500">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

