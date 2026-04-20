import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function formatRelative(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "COMPLETED": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "ARCHIVED": return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    case "PLANNING": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "ON_HOLD": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

export function getTaskStatusColor(status: string) {
  switch (status) {
    case "TODO": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    case "IN_PROGRESS": return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "IN_REVIEW": return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    case "DONE": return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case "CRITICAL": return "text-red-600 dark:text-red-400";
    case "HIGH": return "text-orange-600 dark:text-orange-400";
    case "MEDIUM": return "text-yellow-600 dark:text-yellow-400";
    case "LOW": return "text-gray-500 dark:text-gray-400";
    default: return "text-gray-500";
  }
}

export function getRoleColor(role: string) {
  switch (role) {
    case "LEAD": return "bg-primary/10 text-primary";
    case "CO_LEAD": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "CONTRIBUTOR": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "VIEWER": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    default: return "bg-gray-100 text-gray-600";
  }
}
