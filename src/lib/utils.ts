import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function healthTone(score: number) {
  if (score > 70) return "border-emerald-300/25 bg-emerald-300/5 text-emerald-200";
  if (score >= 40) return "border-amber-300/25 bg-amber-300/5 text-amber-200";
  return "border-rose-300/25 bg-rose-300/5 text-rose-200";
}
