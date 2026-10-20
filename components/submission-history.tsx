import { ExternalLink, CheckCircle2, RotateCcw, XCircle, FileText } from "lucide-react";

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
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  revision: {
    label: "Revision Requested",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: RotateCcw,
  },
  reject: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
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
        className="inline-flex items-center gap-1.5 break-all text-xs font-mono text-emerald-600 hover:text-emerald-700 hover:underline"
      >
        <span>{url}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  return <span className="break-all text-xs font-mono text-gray-500">{url}</span>;
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
            className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-900 text-[10px] font-bold text-white">
                  v{s.version}
                </span>
                <span>Deliverables Version {s.version}</span>
              </span>
              <span className="text-[11px] text-gray-400">
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
              <div className="rounded-lg bg-white border border-gray-100 p-3 text-gray-600 whitespace-pre-wrap ml-6">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Freelancer Notes:</p>
                {s.notes}
              </div>
            )}

            {s.review && decisionCfg && (
              <div className="rounded-xl border p-3 ml-6 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${decisionCfg.className}`}
                  >
                    {DecisionIcon && <DecisionIcon className="h-3 w-3" />}
                    <span>{decisionCfg.label}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Reviewed on {new Date(s.review.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {s.review.feedback && (
                  <p className="text-xs text-gray-700 whitespace-pre-wrap pt-1 border-t border-gray-100">
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
