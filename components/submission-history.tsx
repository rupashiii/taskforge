import { ExternalLink, CheckCircle2, RotateCcw, XCircle } from "lucide-react";

export type HistoryItem = {
  id: string;
  version: number;
  created_at: string;
  links: string[];
  notes: string | null;
  review: {
    decision: string;
    feedback: string | null;
    created_at: string;
  } | null;
};

const DECISION: Record<string, { label: string; className: string; icon: any }> = {
  approve: {
    label: "Accepted & Released",
    className: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    icon: CheckCircle2,
  },
  revision: {
    label: "Revision Requested",
    className: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: RotateCcw,
  },
  reject: {
    label: "Declined",
    className: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: XCircle,
  },
  decline: {
    label: "Declined",
    className: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: XCircle,
  },
};

function SafeLink({ url }: { url: string }) {
  if (/^https?:\/\//i.test(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 break-all text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
      >
        <span>{url}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  return <span className="break-all text-xs font-mono text-muted-foreground">{url}</span>;
}

export default function SubmissionHistory({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((s) => {
        const decisionCfg = s.review ? DECISION[s.review.decision] : null;
        const DecisionIcon = decisionCfg?.icon;

        return (
          <div
            key={s.id}
            className="rounded-lg border border-border bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-bold text-white">
                  v{s.version}
                </span>
                <span>Deliverables Version {s.version}</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {new Date(s.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            <div className="space-y-1 pl-6">
              {s.links.map((l, i) => (
                <div key={i}>
                  <SafeLink url={l} />
                </div>
              ))}
            </div>

            {s.notes && (
              <div className="rounded-md bg-card border border-border p-3 text-foreground/90 whitespace-pre-wrap ml-6">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Freelancer Submission Notes:</p>
                {s.notes}
              </div>
            )}

            {s.review && decisionCfg && (
              <div className="rounded-md border border-border p-3 ml-6 bg-card space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${decisionCfg.className}`}
                  >
                    {DecisionIcon && <DecisionIcon className="h-3 w-3" />}
                    <span>{decisionCfg.label}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Reviewed on {new Date(s.review.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {s.review.feedback && (
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap pt-1.5 border-t border-border">
                    {s.review.feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
