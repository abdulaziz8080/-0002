import type { ReactNode } from "react";
import { STATUS_STYLE, type Status } from "@/lib/status";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      {children}
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.text }} />
      {label ?? status}
    </span>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: "danger" | "warn" | "ok"; sub?: string }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "warn" ? "var(--warn)" : tone === "ok" ? "var(--ok)" : "var(--foreground)";
  return (
    <div className="card p-5">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-12 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">{body}</p>
    </div>
  );
}

export function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
      }`}
    >
      {children}
    </button>
  );
}
