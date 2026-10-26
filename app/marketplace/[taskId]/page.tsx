import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyToTask } from "../actions";
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  ExternalLink,
  Lock
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const APP_STATUS: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending Review",
    className: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  },
  accepted: {
    label: "Selected & Assigned 🎉",
    className: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
  },
  rejected: {
    label: "Not Selected",
    className: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
  },
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
  const isOverdue = task.deadline
    ? new Date(task.deadline).setHours(23, 59, 59, 999) < Date.now()
    : false;
  const canApply =
    isFreelancer &&
    isOpen &&
    !isOverdue &&
    (!myApplication || myApplication.status === "withdrawn");

  const skills: string[] = task.skills_required ?? [];
  const criteria: string[] = task.acceptance_criteria ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Marketplace</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {project?.title ?? "Project"} · Client: {clientName}
              </span>
              <span className="rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 px-2 py-0.2 text-[10px] font-bold text-teal-700 dark:text-teal-300 inline-flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> Escrow Locked
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {task.title}
            </h1>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Guaranteed Milestone Reward
            </p>
            <p className="text-3xl font-extrabold font-mono text-teal-600 dark:text-teal-400">
              {inr(task.reward_amount)}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs font-medium text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Meta Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300"
            >
              {s}
            </span>
          ))}
          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">
            Complexity {task.complexity}/5
          </span>
          {task.estimated_hours && (
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              ~{task.estimated_hours}h estimated
            </span>
          )}
          {task.deadline && (
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              Target: {new Date(task.deadline).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-2 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Deliverable Specification
          </h2>
          <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        </div>

        {/* Acceptance criteria */}
        {criteria.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Required Acceptance Criteria
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-foreground/90">
              {criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Project context */}
        {project?.description && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-2 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              About the Parent Project
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {project.description}
            </p>
          </div>
        )}

        {/* Application Section */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs">
          {!isFreelancer ? (
            <p className="text-xs text-muted-foreground">
              You are signed in as a client. Only freelancer accounts can submit task proposals.
            </p>
          ) : !isOpen ? (
            <p className="text-xs text-muted-foreground">
              This task is currently in <strong className="capitalize">{task.status.replace("_", " ")}</strong> status and is no longer accepting new proposals.
            </p>
          ) : isOverdue ? (
            <div className="rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Target deadline expired — applications closed
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80">
                The deadline for this task expired on{" "}
                <span className="font-bold">
                  {new Date(task.deadline).toLocaleDateString("en-IN")}
                </span>
                . Applications will reopen if the client extends the deadline.
              </p>
            </div>
          ) : myApplication && myApplication.status !== "withdrawn" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Your Submitted Proposal</span>
                <span
                  className={`rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                    APP_STATUS[myApplication.status]?.className ?? "bg-slate-100"
                  }`}
                >
                  {APP_STATUS[myApplication.status]?.label ?? myApplication.status}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-border p-4 text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {myApplication.message}
              </div>
              <Link
                href="/applications"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all your pitches
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            canApply && (
              <form action={applyToTask} className="space-y-4">
                <input type="hidden" name="taskId" value={task.id} />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pitch on This Task</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Describe your relevant experience, proposed approach, and delivery timeline. Your attached resume will be visible to the client.
                  </p>
                </div>

                <textarea
                  name="message"
                  required
                  rows={4}
                  minLength={20}
                  maxLength={1000}
                  placeholder="Why are you the best fit? Highlight relevant projects, questions about the acceptance criteria, or your implementation approach..."
                  className="w-full rounded-md border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-muted-foreground font-mono">20–1000 characters required</span>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit Proposal
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
