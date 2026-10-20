import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startTask, submitWork } from "./actions";
import SubmissionHistory, { type HistoryItem } from "@/components/submission-history";
import {
  ArrowLeft,
  Briefcase,
  Play,
  Send,
  AlertCircle,
  Clock,
  IndianRupee,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  assigned: { label: "Ready to start", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  submitted: { label: "In review", className: "bg-purple-50 text-purple-700 border-purple-200" },
  revision_requested: { label: "Revision requested", className: "bg-orange-50 text-orange-700 border-orange-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200" },
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

  const { data: submissions } = taskIds.length
    ? await supabase
        .from("submissions")
        .select("id, task_id, version, links, notes, created_at")
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
      links: s.links ?? [],
      notes: s.notes,
      review: r
        ? { decision: r.decision, feedback: r.feedback, created_at: r.created_at }
        : null,
    };
    historyByTask.set(s.task_id, [...(historyByTask.get(s.task_id) ?? []), item]);
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to dashboard</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Assigned Tasks</h1>
          <p className="mt-1 text-xs text-gray-500">
            Work on assigned deliverables, submit proof links, and track revision requests.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {list.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No active tasks assigned</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Browse the marketplace and apply for tasks matching your skills. Once a client selects you, tasks will appear here.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {list.map((task: any) => {
              const project = one<{ title: string }>(task.projects);
              const statusCfg = TASK_STATUS[task.status] ?? {
                label: task.status,
                className: "bg-gray-100 text-gray-700 border-gray-200",
              };
              const history = historyByTask.get(task.id) ?? [];
              const latestReview = history[0]?.review;
              const isOverdue = task.deadline && ["assigned", "in_progress", "revision_requested"].includes(task.status)
                ? new Date(task.deadline).setHours(23, 59, 59, 999) < Date.now()
                : false;

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        {project?.title && (
                          <span className="text-xs font-medium text-gray-400">
                            Project: {project.title}
                          </span>
                        )}
                        <h2 className="text-lg font-bold text-gray-900 mt-0.5">{task.title}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                        <span className="text-lg font-bold font-mono tabular-nums text-emerald-600">
                          {inr(task.reward_amount)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>

                    {task.deadline && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <div
                          className={`flex items-center gap-1.5 ${
                            isOverdue ? "text-red-600 font-semibold" : "text-gray-500"
                          }`}
                        >
                          <Calendar
                            className={`h-3.5 w-3.5 ${
                              isOverdue ? "text-red-500" : "text-gray-400"
                            }`}
                          />
                          <span>
                            Deadline: {new Date(task.deadline).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
                            Deadline Passed (Overdue)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Acceptance criteria checklist */}
                    {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
                      <div className="mt-4 rounded-xl bg-gray-50/80 border border-gray-100 p-4">
                        <p className="text-xs font-semibold text-gray-900 mb-2">
                          Acceptance Criteria Checklist:
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-600">
                          {task.acceptance_criteria.map((c: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions / Interactive Area */}
                  <div className="p-6 bg-gray-50/30">
                    {isOverdue ? (
                      <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-800 space-y-1.5">
                        <p className="font-bold text-red-900 flex items-center gap-1.5 text-sm">
                          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                          <span>Deadline has passed — Submissions are locked</span>
                        </p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          The target deadline for this task passed on{" "}
                          <span className="font-semibold underline">
                            {new Date(task.deadline).toLocaleDateString("en-IN")}
                          </span>
                          . Deliverables can no longer be submitted, and the client may reclaim and reopen this task on the marketplace.
                        </p>
                      </div>
                    ) : (
                      <>
                        {task.status === "assigned" && (
                          <form action={startTask}>
                            <input type="hidden" name="taskId" value={task.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                            >
                              <Play className="h-4 w-4 fill-white" />
                              <span>Start Working on Task</span>
                            </button>
                          </form>
                        )}

                        {(task.status === "in_progress" || task.status === "revision_requested") && (
                          <div className="space-y-4">
                            {task.status === "revision_requested" && latestReview && (
                              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs">
                                <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <span>Client Feedback (Revision {task.revision_count ?? 1} of {task.max_revisions ?? 3}):</span>
                                </p>
                                <p className="mt-1 text-amber-800 whitespace-pre-wrap">
                                  {latestReview.feedback}
                                </p>
                              </div>
                            )}

                            <form action={submitWork} className="space-y-3">
                              <input type="hidden" name="taskId" value={task.id} />
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Deliverable Links (GitHub, Figma, Google Drive, Loom, PRs)
                                </label>
                                <textarea
                                  name="links"
                                  rows={3}
                                  required
                                  placeholder="https://github.com/user/repo/pull/1&#10;https://www.figma.com/file/..."
                                  className="w-full rounded-xl border border-gray-200 p-3 text-xs font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">One URL per line (up to 10 links).</p>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Submission Notes (Optional)
                                </label>
                                <textarea
                                  name="notes"
                                  rows={2}
                                  maxLength={2000}
                                  placeholder="Brief summary of what was completed, instructions to test..."
                                  className="w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>

                              <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>
                                  {task.status === "revision_requested"
                                    ? `Resubmit Revision ${Number(task.revision_count ?? 0) + 1}`
                                    : "Submit Deliverables for Review"}
                                </span>
                              </button>
                            </form>
                          </div>
                        )}
                      </>
                    )}

                    {task.status === "submitted" && (
                      <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900">
                        <Clock className="h-4 w-4 text-purple-600 shrink-0" />
                        <span>Work submitted! Awaiting the client's review decision.</span>
                      </div>
                    )}

                    {task.status === "completed" && (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>This task is complete! Escrow funds have been released to your wallet.</span>
                      </div>
                    )}

                    {/* Submission History Section */}
                    {history.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <details className="text-xs group">
                          <summary className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center justify-between">
                            <span>Submission History ({history.length} versions)</span>
                            <span className="text-gray-400 text-[11px] group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="mt-3">
                            <SubmissionHistory items={history} />
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
