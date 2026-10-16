import { Bot, Check, CircleDashed, CircleX, Copy, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Logo({ inverted = false }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("grid size-8 place-items-center rounded-md", inverted ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>
        <ShieldCheck className="size-4.5" strokeWidth={2.25} />
      </span>
      <span className={cn("text-[17px] font-semibold tracking-tight", inverted ? "text-primary-foreground" : "text-foreground")}>Custodia</span>
    </span>
  );
}

const roleStyle = {
  Admin: "bg-primary text-primary-foreground",
  Police: "bg-accent-soft text-accent ring-1 ring-accent/25",
  Court: "bg-warning-soft text-warning ring-1 ring-warning/30",
  Intermediary: "bg-violet-50 text-violet-700 ring-1 ring-violet-300/60",
  Victim: "bg-rose-50 text-rose-700 ring-1 ring-rose-300/60",
  None: "bg-muted text-muted-foreground",
};

export function RoleBadge({ role }) {
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", roleStyle[role] || roleStyle.None)}>
      {role}
    </span>
  );
}

const statusStyle = {
  Open: "bg-warning-soft text-warning",
  "Under Review": "bg-accent-soft text-accent",
  Closed: "bg-success-soft text-success",
};

export function StatusPill({ status }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyle[status] || statusStyle.Open)}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/** Intermediary human-review state: Pending / Approved / Rejected */
export function ReviewBadge({ status }) {
  if (status === "Approved")
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success"><Check className="size-3.5" strokeWidth={3} />Reviewed ✓</span>;
  if (status === "Rejected")
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-destructive"><CircleX className="size-3.5" />Rejected ✗</span>;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><CircleDashed className="size-3.5" />Pending Review</span>;
}

/** AI-generated likelihood. 255 = not checked. Dashed border + bot icon keeps it distinct from the hash-integrity badge. */
export function AiScoreBadge({ score }) {
  if (score === undefined || score === null || score === 255 || Number.isNaN(score))
    return <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground/70"><Bot className="size-3.5" />AI check: n/a</span>;
  if (score > 50)
    return (
      <span title="Deepfake detector estimate — not proof. Review manually." className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-dashed border-destructive/60 bg-danger-soft px-2 py-0.5 text-xs font-semibold text-destructive">
        <Bot className="size-3.5" />⚠ Possible AI-generated ({score}%)
      </span>
    );
  return (
    <span title="Deepfake detector estimate" className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Bot className="size-3.5" />AI check: {score}%
    </span>
  );
}

/** Shown when a connected wallet opens a dashboard its role can't access */
export function AccessDenied({ required }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-muted"><Lock className="size-6 text-muted-foreground" /></span>
      <p className="font-medium">Restricted area</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">This dashboard is only available to wallets holding the <span className="font-semibold">{required}</span> role. Ask the admin to assign it.</p>
    </div>
  );
}

export function CopyChip({ value, display, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={value}
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 1400);
      }}
      className={cn("group inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted px-2 py-1 font-mono text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-accent-soft active:scale-[0.98]", className)}
    >
      <span className="truncate">{display ?? value}</span>
      {copied ? <Check className="size-3.5 shrink-0 text-success" /> : <Copy className="size-3.5 shrink-0 text-muted-foreground group-hover:text-accent" />}
    </button>
  );
}

export function Panel({ title, description, icon, children, action }) {
  return (
    <section className="rounded-lg border bg-card shadow-card">
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 grid size-8 place-items-center rounded-md bg-muted text-foreground">{icon}</span>}
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
