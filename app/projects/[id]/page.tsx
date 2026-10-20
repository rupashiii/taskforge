import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskFields from "./task-fields";
import { addTask, deleteTask, publishProject, reclaimOverdueTask } from "./task-actions";
import {
  ArrowLeft,
  Briefcase,
  Plus,
  Trash2,
  Edit,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Eye,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";

const PROJECT_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
  breakdown_ready: { label: "Breakdown Ready", className: "bg-blue-50 text-blue-700 border-blue-200" },
  published: { label: "Published & Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", className: "bg-purple-50 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-200" },
};

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
  open: { label: "Open for Applications", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  assigned: { label: "Assigned", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  submitted: { label: "Ready for Review", className: "bg-purple-50 text-purple-700 border-purple-200" },
  revision_requested: { label: "Revision Requested", className: "bg-orange-50 text-orange-700 border-orange-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, status, total_budget, created_at, client_id")
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

  const assignedIds = taskList
    .map((t) => t.assigned_to)
    .filter((v): v is string => Boolean(v));

  const { data: people } = assignedIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assignedIds)
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

  const statusCfg = PROJECT_STATUS[project.status] ?? {
    label: project.status,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

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

        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${statusCfg.className}`}
              >
                {statusCfg.label}
              </span>
              <span className="text-xs text-gray-400">
                Created {new Date(project.created_at).toLocaleDateString("en-IN")}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{project.title}</h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] uppercase font-semibold text-gray-400 block">
              Max Cap Budget
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-gray-900">
              {budget > 0 ? inr(budget) : "No Limit"}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Project Requirements */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Project Scope & Requirements
          </h2>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* Financial & Task Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Tasks
            </span>
            <p className="mt-1 text-2xl font-bold font-mono text-gray-900">{taskList.length}</p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Total Rewards
            </span>
            <p
              className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                overBudget ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {inr(totalReward)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Allocated Budget
            </span>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-gray-900">
              {budget > 0 ? inr(budget) : "—"}
            </p>
          </div>
        </div>

        {overBudget && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>
              Total task rewards exceed your budget ({inr(totalReward)} &gt; {inr(budget)}). Reduce individual rewards or delete tasks before publishing.
            </span>
          </div>
        )}

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Project Tasks ({taskList.length})
            </h2>
            {isDraft && (
              <span className="text-xs text-gray-400">
                Draft phase · Edit and re-order freely
              </span>
            )}
          </div>

          {taskList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
              No tasks added yet. Add tasks below to split the project into funded milestones.
            </div>
          ) : (
            <div className="space-y-3">
              {taskList.map((t, idx) => {
                const pending = pendingByTask.get(t.id) ?? 0;
                const assignee = t.assigned_to ? nameById.get(t.assigned_to) : null;
                const isOverdue =
                  t.deadline &&
                  ["assigned", "in_progress", "revision_requested"].includes(t.status)
                    ? new Date(t.deadline).setHours(23, 59, 59, 999) < Date.now()
                    : false;
                const taskStatusCfg = TASK_STATUS[t.status] ?? {
                  label: t.status,
                  className: "bg-gray-100 text-gray-700 border-gray-200",
                };

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                            {idx + 1}
                          </span>
                          <h3 className="font-semibold text-gray-900">{t.title}</h3>
                        </div>
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">
                          {t.description}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right pl-7 sm:pl-0">
                        <span className="text-base font-bold font-mono tabular-nums text-emerald-600 block">
                          {inr(t.reward_amount)}
                        </span>
                        <div className="flex items-center gap-1.5 justify-start sm:justify-end mt-0.5">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${taskStatusCfg.className}`}
                          >
                            {taskStatusCfg.label}
                          </span>
                          {isOverdue && (
                            <span className="inline-block rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-7 text-xs text-gray-500">
                      {t.skills_required?.map((s: string) => (
                        <span
                          key={s}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                        >
                          {s}
                        </span>
                      ))}
                      <span>Complexity {t.complexity}/5</span>
                      {t.estimated_hours && <span>· {t.estimated_hours}h est.</span>}
                      {t.deadline && (
                        <span>· Due {new Date(t.deadline).toLocaleDateString("en-IN")}</span>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 pl-7 text-xs">
                      {isDraft ? (
                        <>
                          <Link
                            href={`/projects/${id}/tasks/${t.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit</span>
                          </Link>
                          <form action={deleteTask}>
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="taskId" value={t.id} />
                            <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          </form>
                        </>
                      ) : (
                        <>
                          {["submitted", "revision_requested", "completed"].includes(t.status) && (
                            <Link
                              href={`/projects/${id}/tasks/${t.id}/review`}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                t.status === "submitted"
                                  ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                                  : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>
                                {t.status === "submitted" ? "Review Submission 🚀" : "View Submission"}
                              </span>
                            </Link>
                          )}
                          {assignee && (
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                              Assigned to {assignee}
                            </span>
                          )}
                          <Link
                            href={`/projects/${id}/tasks/${t.id}/applicants`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Users className="h-3.5 w-3.5 text-gray-500" />
                            <span>
                              {t.status === "open"
                                ? `View Applicants${pending > 0 ? ` (${pending} pending)` : ""}`
                                : "View Applicants"}
                            </span>
                          </Link>

                          {isOverdue && (
                            <form action={reclaimOverdueTask} className="inline-block">
                              <input type="hidden" name="projectId" value={id} />
                              <input type="hidden" name="taskId" value={t.id} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors shadow-xs"
                                title="The freelancer missed the deadline. Reclaim this task to re-open it on the marketplace."
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reclaim &amp; Reopen Task</span>
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Task + Publish (Draft projects only) */}
        {isDraft ? (
          <div className="space-y-6">
            {/* Add Task Collapsible Form */}
            <details
              open={taskList.length === 0}
              className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm group"
            >
              <summary className="cursor-pointer text-sm font-semibold text-gray-900 list-none flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-600" />
                  <span>Add a New Task</span>
                </span>
                <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <form action={addTask} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={id} />
                <TaskFields />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task</span>
                </button>
              </form>
            </details>

            {/* Publish & Fund Escrow Card */}
            <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50/40 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-gray-900">
                    Ready to Publish and Fund Escrow?
                  </h2>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    Publishing makes all tasks visible on the marketplace and locks{" "}
                    <span className="font-semibold text-gray-900 font-mono">
                      {inr(totalReward)}
                    </span>{" "}
                    from your wallet in escrow in one atomic transaction. Tasks cannot be edited once published.
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <form action={publishProject}>
                      <input type="hidden" name="projectId" value={id} />
                      <button
                        disabled={taskList.length === 0 || overBudget}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>Publish Project &amp; Lock Escrow</span>
                      </button>
                    </form>
                    <Link
                      href="/wallet"
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 underline"
                    >
                      Check Wallet Balance →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-800 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              This project is live! Review incoming applicants for each task to select your freelancers.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
