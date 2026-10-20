import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyToTask } from "../actions";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Send,
  AlertCircle,
  ExternalLink,
  User,
  Shield,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const APP_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { label: "Accepted 🎉", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Not Selected", className: "bg-gray-100 text-gray-500 border-gray-200" },
  withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-400 border-gray-200" },
};

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { taskId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, title, description, skills_required, acceptance_criteria, complexity, estimated_hours, reward_amount, deadline, status, projects(title, description, client_id)"
    )
    .eq("id", taskId)
    .single();

  if (!task) notFound();

  const project = one<{ title: string; description: string; client_id: string }>(
    task.projects as any
  );

  let clientName = "Client";
  if (project?.client_id) {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", project.client_id)
      .single();
    if (clientProfile?.full_name) clientName = clientProfile.full_name;
  }

  const { data: myApplication } = await supabase
    .from("applications")
    .select("id, status, message")
    .eq("task_id", taskId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  const isFreelancer = profile?.role === "freelancer";
  const isOpen = task.status === "open";
  const canApply =
    isFreelancer && isOpen && (!myApplication || myApplication.status === "withdrawn");

  const skills: string[] = task.skills_required ?? [];
  const criteria: string[] = task.acceptance_criteria ?? [];

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to marketplace</span>
        </Link>

        {/* Task Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <span className="text-xs font-medium text-gray-400">
              Project: {project?.title ?? "Project"} · Posted by {clientName}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-1">
              {task.title}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] uppercase font-semibold text-gray-400 block">
              Escrow Guaranteed Reward
            </span>
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-600">
              {inr(task.reward_amount)}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Task Meta Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-lg bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 shadow-xs"
            >
              {s}
            </span>
          ))}
          <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600">
            Complexity {task.complexity}/5
          </span>
          {task.estimated_hours && (
            <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{task.estimated_hours} hours
            </span>
          )}
          {task.deadline && (
            <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {new Date(task.deadline).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>

        {/* Description Card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Task Description
          </h2>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        </div>

        {/* Acceptance Criteria */}
        {criteria.length > 0 && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Deliverable Acceptance Criteria
            </h2>
            <ul className="space-y-2 text-xs text-gray-700">
              {criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Project Context */}
        {project?.description && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              About the Project
            </h2>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
              {project.description}
            </p>
          </div>
        )}

        {/* Application Card */}
        <div className="rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-sm space-y-4">
          {!isFreelancer ? (
            <div className="text-xs text-gray-500">
              You are signed in as a client. Only freelancer accounts can apply to marketplace tasks.
            </div>
          ) : !isOpen ? (
            <div className="text-xs text-gray-500">
              This task is no longer open for new applications.
            </div>
          ) : myApplication && myApplication.status !== "withdrawn" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-900">
                  Your Application Status
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    APP_STATUS[myApplication.status]?.className ?? "bg-gray-100"
                  }`}
                >
                  {APP_STATUS[myApplication.status]?.label ?? myApplication.status}
                </span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3.5 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {myApplication.message}
              </div>
              <Link
                href="/applications"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
              >
                <span>View all my applications</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            canApply && (
              <form action={applyToTask} className="space-y-4">
                <input type="hidden" name="taskId" value={task.id} />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Apply for This Task</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Describe your relevant experience, portfolio links, and estimated completion timeline.
                  </p>
                </div>

                <textarea
                  name="message"
                  required
                  rows={4}
                  minLength={20}
                  maxLength={1000}
                  placeholder="Explain why you are the best fit for this task. Include any questions or how you plan to tackle the acceptance criteria."
                  className="w-full rounded-xl border border-gray-200 p-4 text-xs leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-400">
                    Min 20 characters · Max 1000 characters
                  </span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Application</span>
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
