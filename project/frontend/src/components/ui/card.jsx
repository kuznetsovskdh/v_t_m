import { cn } from "../../lib/utils.js";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div className={cn("mb-2", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h2 className={cn("text-lg font-semibold", className)} {...props} />
  );
}

