import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskFields from "./task-fields";
import {
  addTask,
  deleteTask,
  publishProject,
  generateMilestonesWithAI,
} from "./task-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import {
  ArrowLeft,
  Users,
  Layers,
  Wallet,
  FileCheck2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  },
  breakdown_ready: {
    label: "Breakdown ready",
    className:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  published: {
    label: "Published",
    className:
      "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  completed: {
    label: "Completed",
    className:
      "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
  open: {
    label: "Open",
    className:
      "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  assigned: {
    label: "Assigned",
    className:
      "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  in_progress: {
    label: "In progress",
    className:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  submitted: {
    label: "Submitted",
    className:
      "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  revision_requested: {
    label: "Revision requested",
    className:
      "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  completed: {
    label: "Completed",
    className:
      "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ai_error?: string }>;
}) {
  const { id } = await params;
  const { error, ai_error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, description, status, total_budget, created_at, client_id"
    )
    .eq("id", id)
    .single();

  if (!project || project.client_id !== user.id) notFound();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, skills_required, complexity, estimated_hours, reward_amount, deadline, status, assigned_to"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  const taskList = tasks ?? [];
  const isDraft = project.status === "draft";

  // Applicant counts per task
  const taskIds = taskList.map((t) => t.id);
  const { data: apps } = taskIds.length
    ? await supabase
        .from("applications")
        .select("task_id, status")
        .in("task_id", taskIds)
    : { data: [] };

  const pendingByTask = new Map<string, number>();
  for (const a of apps ?? []) {
    if (a.status === "pending") {
      pendingByTask.set(a.task_id, (pendingByTask.get(a.task_id) ?? 0) + 1);
    }
  }

  // Names of assigned freelancers
  const assignedIds = taskList
    .map((t) => t.assigned_to)
    .filter((v): v is string => Boolean(v));

  const { data: people } = assignedIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", assignedIds)
    : { data: [] };

  const nameById = new Map<string, string>(
    (people ?? []).map((p: any) => [p.id, p.full_name ?? "Freelancer"])
  );

  const totalReward = taskList.reduce(
    (sum, t) => sum + Number(t.reward_amount ?? 0),
    0
  );
  const budget = Number(project.total_budget ?? 0);
  const overBudget = budget > 0 && totalReward > budget;

  const pst = PROJECT_STATUS[project.status] ?? {
    label: project.status,
    className: "bg-muted text-muted-foreground border-border",
  };

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

        <div className="mt-4 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {project.title}
          </h1>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${pst.className}`}
          >
            {pst.label}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Created {new Date(project.created_at).toLocaleDateString("en-IN")}
          {budget > 0 && ` · Budget up to ${inr(budget)}`}
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {ai_error && (
          <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  AI Milestone Decomposition Notice
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {ai_error}
                </p>
              </div>
            </div>
            {isDraft && (
              <form action={generateMilestonesWithAI} className="pt-1">
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="force" value="true" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 dark:bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry AI Decomposition
                </button>
              </form>
            )}
          </div>
        )}

        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Requirements
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-foreground">
            {project.description}
          </p>
        </section>

        {/* Summary */}
        <section className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tasks
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {taskList.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total rewards
              </p>
            </div>
            <p
              className={`mt-1 text-2xl font-bold ${
                overBudget
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground"
              }`}
            >
              {inr(totalReward)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Budget
              </p>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {budget > 0 ? inr(budget) : "—"}
            </p>
          </div>
        </section>

        {overBudget && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            Total rewards are above your budget. Reduce rewards or remove tasks
            before publishing.
          </p>
        )}

        {/* Task list */}
        <section className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isDraft ? "Milestones (AI Decomposed)" : "Milestones"}
              </h2>
              {isDraft && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review generated milestones. Click <strong>Edit</strong> to modify requirements or rewards, then approve to lock escrow.
                </p>
              )}
            </div>

            {isDraft && taskList.length > 0 && (
              <form action={generateMilestonesWithAI}>
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="force" value="true" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs shrink-0"
                  title="Re-run AI decomposition on your project description"
                >
                  <RefreshCw className="h-3 w-3 text-muted-foreground" />
                  <span>Regenerate Milestones with AI</span>
                </button>
              </form>
            )}
          </div>

          {taskList.length === 0 ? (
            isDraft ? (
              <div className="mt-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 dark:bg-primary/10 p-8 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    No milestones generated yet
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Click below to decompose your project scope and budget into 3 to 6 structured milestones.
                  </p>
                </div>
                <form action={generateMilestonesWithAI}>
                  <input type="hidden" name="projectId" value={id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Milestones with AI
                  </button>
                </form>
              </div>
            ) : (
              <p className="mt-3 text-muted-foreground text-sm">
                No milestones have been published for this project.
              </p>
            )
          ) : (
            <ul className="mt-4 space-y-3">
              {taskList.map((t, i) => {
                const pending = pendingByTask.get(t.id) ?? 0;
                const assignee = t.assigned_to
                  ? nameById.get(t.assigned_to)
                  : null;
                const tst = TASK_STATUS[t.status] ?? {
                  label: t.status,
                  className:
                    "bg-muted text-muted-foreground border-border",
                };

                return (
                  <li
                    key={t.id}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground">
                          {i + 1}. {t.title}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {t.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-foreground">
                          {inr(t.reward_amount)}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${tst.className}`}
                        >
                          {tst.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {t.skills_required?.map((s: string) => (
                        <span
                          key={s}
                          className="rounded-full border border-border px-2.5 py-0.5"
                        >
                          {s}
                        </span>
                      ))}
                      <span>Complexity {t.complexity}/5</span>
                      {t.estimated_hours && (
                        <span>· {t.estimated_hours} h</span>
                      )}
                      {t.deadline && (
                        <span>
                          · Due{" "}
                          {new Date(t.deadline).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>

                    {isDraft ? (
                      <div className="mt-4 flex gap-3">
                        <Link
                          href={`/projects/${id}/tasks/${t.id}/edit`}
                          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          Edit
                        </Link>
                        <form action={deleteTask}>
                          <input
                            type="hidden"
                            name="projectId"
                            value={id}
                          />
                          <input
                            type="hidden"
                            name="taskId"
                            value={t.id}
                          />
                          <button className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                            Delete
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                        {assignee && (
                          <span className="rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 px-3 py-1 text-teal-800 dark:text-teal-300 text-xs font-medium">
                            Assigned to {assignee}
                          </span>
                        )}
                        <Link
                          href={`/projects/${id}/tasks/${t.id}/applicants`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {t.status === "open"
                            ? `View applicants${
                                pending > 0 ? ` (${pending} pending)` : ""
                              }`
                            : "View applicants"}
                        </Link>
                        {["submitted", "revision_requested", "completed"].includes(t.status) && (
                          <Link
                            href={`/projects/${id}/tasks/${t.id}/review`}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                              t.status === "submitted"
                                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                                : "border-border text-foreground hover:bg-muted"
                            }`}
                          >
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {t.status === "submitted"
                              ? "Review submission"
                              : "View submissions"}
                          </Link>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Optional Custom Milestone + Human-in-the-Loop Approval (draft only) */}
        {isDraft ? (
          <>
            {/* Optional Custom Milestone */}
            <details className="mt-6 rounded-xl border border-border bg-card p-5 group">
              <summary className="cursor-pointer text-sm font-semibold text-foreground flex items-center justify-between">
                <span>+ Add a custom milestone (Optional)</span>
                <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <form action={addTask} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={id} />
                <TaskFields />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Save custom milestone
                </button>
              </form>
            </details>

            {/* Human-in-the-Loop Approval & Escrow Lock */}
            <section className="mt-6 rounded-xl border-2 border-primary bg-card p-6 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Approve Milestones &amp; Fund Escrow
                </h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Carefully review the decomposed milestones above. Once approved, the total reward ({inr(totalReward)}) will be locked into escrow from your wallet balance, and the milestones will go live for freelancers on the marketplace.
                </p>
              </div>

              {overBudget && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-medium text-red-700 dark:text-red-400">
                  Total milestone rewards ({inr(totalReward)}) exceed your project budget ({inr(budget)}). Please edit or delete milestones before approving.
                </div>
              )}

              <form action={publishProject} className="pt-1 flex flex-wrap items-center gap-3">
                <input type="hidden" name="projectId" value={id} />
                <button
                  disabled={taskList.length === 0 || overBudget}
                  className="rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Approve &amp; Lock Escrow ({inr(totalReward)})
                </button>
                <Link
                  href="/wallet"
                  className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Check Wallet Balance
                </Link>
              </form>
            </section>
          </>
        ) : (
          <p className="mt-6 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-4 text-sm text-teal-800 dark:text-teal-300">
            This project is published. Open each task to review applicants and
            select a freelancer.
          </p>
        )}
      </div>
    </main>
  );
}
