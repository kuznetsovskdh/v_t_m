import { cn } from "../../lib/utils.js";

export function Button({ className, variant = "default", ...props }) {
  const variants = {
    default:
      "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-900",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
        variants[variant] ?? variants.default,
        className,
      )}
      {...props}
    />
  );
}

