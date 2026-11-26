import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startTask } from "./actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import SubmissionHistory, {
  type HistoryItem,
} from "@/components/submission-history";
import DualSubmitForm from "@/components/DualSubmitForm";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  History,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  assigned: {
    label: "Ready to start",
    className:
      "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  in_progress: {
    label: "In progress",
    className:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  submitted: {
    label: "Waiting for review",
    className:
      "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  revision_requested: {
    label: "Revision requested",
    className:
      "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  completed: {
    label: "Completed & Paid",
    className:
      "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
};

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, reward_amount, deadline, status, acceptance_criteria, revision_count, max_revisions, projects(title)"
    )
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  const list = tasks ?? [];
  const taskIds = list.map((t) => t.id);

  // Submission history (newest first) with the client's review for each
  const { data: submissions } = taskIds.length
    ? await supabase
        .from("submissions")
        .select("id, task_id, version, preview_links, preview_notes, created_at")
        .eq("freelancer_id", user.id)
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const subIds = (submissions ?? []).map((s: any) => s.id);

  const { data: reviews } = subIds.length
    ? await supabase
        .from("reviews")
        .select("submission_id, decision, feedback, created_at")
        .in("submission_id", subIds)
    : { data: [] };

  const reviewBySub = new Map<string, any>(
    (reviews ?? []).map((r: any) => [r.submission_id, r])
  );

  const historyByTask = new Map<string, HistoryItem[]>();
  for (const s of (submissions ?? []) as any[]) {
    const r = reviewBySub.get(s.id);
    const item: HistoryItem = {
      id: s.id,
      version: s.version,
      created_at: s.created_at,
      links: s.preview_links ?? [],
      notes: s.preview_notes,
      review: r
        ? {
            decision: r.decision,
            feedback: r.feedback,
            created_at: r.created_at,
          }
        : null,
    };
    historyByTask.set(s.task_id, [
      ...(historyByTask.get(s.task_id) ?? []),
      item,
    ]);
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Task<span className="text-primary">Forge</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell userId={user.id} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks a client has assigned to you. Work on deliverables and submit
          when ready for review.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {list.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <p>No tasks assigned yet.</p>
            <Link
              href="/marketplace"
              className="mt-2 inline-block font-medium text-primary underline"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-6">
            {list.map((t) => {
              const project = one<{ title: string }>(t.projects as any);
              const status = TASK_STATUS[t.status] ?? {
                label: t.status,
                className: "bg-muted text-muted-foreground border-border",
              };
              const criteria: string[] = t.acceptance_criteria ?? [];
              const history = historyByTask.get(t.id) ?? [];
              const latestFeedback =
                t.status === "revision_requested"
                  ? history.find((h) => h.review?.decision === "revision")
                      ?.review?.feedback
                  : null;
              const canSubmit =
                t.status === "in_progress" || t.status === "revision_requested";

              return (
                <li
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-6 shadow-xs hover:border-border/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {t.title}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-foreground">
                          {project?.title ?? "Project"}
                        </span>
                        {t.deadline && (
                          <>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            Due{" "}
                            {new Date(t.deadline).toLocaleDateString("en-IN")}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold text-foreground">
                        {inr(t.reward_amount)}
                      </p>
                      <span
                        className={`inline-block mt-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>

                  {criteria.length > 0 && (
                    <div className="mt-4 rounded-lg bg-muted/40 p-3.5 border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Acceptance criteria
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {criteria.map((c, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                            <span className="text-xs leading-normal">{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action 1: Start work */}
                  {t.status === "assigned" && (
                    <form action={startTask} className="mt-4">
                      <input type="hidden" name="taskId" value={t.id} />
                      <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                        Start work
                      </button>
                    </form>
                  )}

                  {/* Revision notice */}
                  {t.status === "revision_requested" && (
                    <div className="mt-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/40 p-4 text-sm text-orange-900 dark:text-orange-200">
                      <p className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        The client requested revisions (revision{" "}
                        {t.revision_count ?? 0} of {t.max_revisions ?? 3})
                      </p>
                      {latestFeedback && (
                        <p className="mt-1.5 pl-5 whitespace-pre-wrap text-xs text-orange-800 dark:text-orange-300">
                          {latestFeedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action 2: Submit work */}
                  {canSubmit && (
                    <div className="mt-5">
                      <DualSubmitForm
                        taskId={t.id}
                        isRevision={t.status === "revision_requested"}
                      />
                    </div>
                  )}

                  {/* Status notice: Submitted */}
                  {t.status === "submitted" && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 p-3.5 text-xs font-medium text-purple-900 dark:text-purple-300">
                      <FileCheck2 className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                      <span>
                        Your work has been submitted! It is currently under
                        review by the client.
                      </span>
                    </div>
                  )}

                  {/* Status notice: Completed */}
                  {t.status === "completed" && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-3.5 text-xs font-medium text-teal-900 dark:text-teal-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                      <span>
                        The client approved your deliverables and released the
                        escrow reward to your wallet!
                      </span>
                    </div>
                  )}

                  {/* Submission history accordion */}
                  {history.length > 0 && (
                    <details className="mt-4 group">
                      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                        <History className="h-3.5 w-3.5" />
                        <span>Submission history ({history.length})</span>
                      </summary>
                      <div className="mt-3 pt-3 border-t border-border">
                        <SubmissionHistory items={history} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
