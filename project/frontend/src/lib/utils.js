import { twMerge } from "tailwind-merge";

export function cn(...classes) {
  const flat = classes.flat().filter(Boolean).join(" ");
  return twMerge(flat);
}

