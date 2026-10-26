import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  FileText,
  Briefcase,
  Award,
  ShieldCheck,
  ExternalLink,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { computeFreelancerRating } from "@/lib/rating";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  assigned: {
    label: "Assigned",
    className: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  submitted: {
    label: "In Review",
    className: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  revision_requested: {
    label: "Revision Requested",
    className: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  completed: {
    label: "Completed & Paid",
    className: "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700",
  },
};

export default async function FreelancerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the target freelancer's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, skills, rating, resume_url, created_at")
    .eq("id", id)
    .single();

  if (!profile || profile.role !== "freelancer") notFound();

  // Fetch all tasks assigned to this freelancer
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, status, reward_amount, created_at, deadline, project_id, projects(title)"
    )
    .eq("assigned_to", id)
    .order("created_at", { ascending: false });

  const taskList = (tasks ?? []) as any[];

  // Fetch all submissions by this freelancer
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, task_id, version, created_at")
    .eq("freelancer_id", id)
    .order("created_at", { ascending: false });

  const subList = (submissions ?? []) as any[];
  const subIds = subList.map((s) => s.id);

  // Fetch all client reviews for this freelancer's submissions
  const { data: reviews } = subIds.length
    ? await supabase
        .from("reviews")
        .select("id, submission_id, decision, feedback, created_at")
        .in("submission_id", subIds)
    : { data: [] };

  const revList = (reviews ?? []) as any[];

  // 1. Accepted Tasks count: completed tasks and approved submissions
  const completedTasks = taskList.filter((t) => t.status === "completed");
  const approvedReviews = revList.filter((r) => r.decision === "approve");
  const acceptedTasksCount = Math.max(completedTasks.length, approvedReviews.length);

  // 2. Rejected Tasks count: client reviews marked as 'reject'
  const rejectedReviews = revList.filter((r) => r.decision === "reject");
  const rejectedTasksCount = rejectedReviews.length;

  // 3. Asked for Review count:
  // Includes client revision requests (decision = 'revision') plus tasks currently awaiting review
  const revisionReviews = revList.filter((r) => r.decision === "revision");
  const currentlyInReviewTasks = taskList.filter((t) =>
    ["submitted", "revision_requested"].includes(t.status)
  );
  const askedForReviewCount = revisionReviews.length + currentlyInReviewTasks.length;

  // 4. Dynamic Average Rating: 5.0 * (Accepted / (Accepted + Rejected))
  const dynamicRating = computeFreelancerRating(acceptedTasksCount, rejectedTasksCount);
  const ratingFormatted = dynamicRating.formatted;
  const ratingDescription = dynamicRating.label;

  // Total Earnings across completed tasks
  const totalEarnings = completedTasks.reduce(
    (sum, t) => sum + Number(t.reward_amount ?? 0),
    0
  );

  const skills: string[] = profile.skills ?? [];
  const displayName = profile.full_name || "Freelancer";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "Recently joined";

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Viewing Verified Profile
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Hero Card */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-xs shrink-0 tracking-wider">
                {initials || "FL"}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Verified Talent
                  </span>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="capitalize">{profile.role || "Freelancer"}</span>
                  <span>•</span>
                  <span>Joined {memberSince}</span>
                </p>

                {profile.resume_url && (
                  <div className="pt-2">
                    <a
                      href={profile.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>View Candidate Resume (PDF)</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Rating Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-border gap-1 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Client Rating
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-base font-extrabold">{ratingFormatted}</span>
                  <span className="text-xs text-amber-700/70 dark:text-amber-400/70 font-semibold">
                    / 5.0
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {dynamicRating.isNew ? "Default rating (new talent)" : `${dynamicRating.acceptanceRatePercent}% acceptance rate`}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Main Performance Metrics Requested by Client */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Performance Track Record &amp; Metrics
            </h2>
            <span className="text-xs text-muted-foreground">
              Calculated across all TaskForge deliverables
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Accepted Tasks */}
            <div className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/30 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                  Tasks Accepted
                </span>
                <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold font-mono text-teal-700 dark:text-teal-300">
                {acceptedTasksCount}
              </p>
              <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 leading-tight">
                Deliverables approved and escrow released
              </p>
            </div>

            {/* 2. Asked for Review */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/30 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Asked For Review
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <RotateCcw className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold font-mono text-amber-700 dark:text-amber-300">
                {askedForReviewCount}
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-tight">
                Revision requests &amp; active reviews
              </p>
            </div>

            {/* 3. Rejected Tasks */}
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/30 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                  Tasks Rejected
                </span>
                <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-red-700 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold font-mono text-red-700 dark:text-red-300">
                {rejectedTasksCount}
              </p>
              <p className="text-[11px] text-red-800/80 dark:text-red-300/80 leading-tight">
                Deliverables declined by client review
              </p>
            </div>

            {/* 4. Average Rating */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                  Average Rating
                </span>
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <p className="text-3xl font-extrabold font-mono text-blue-700 dark:text-blue-300">
                {ratingFormatted}
                <span className="text-sm font-normal text-muted-foreground ml-1">★</span>
              </p>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-tight">
                {ratingDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Skills & Resume Details */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Skills Section */}
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Technical Skills &amp; Stack</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified domains and technologies this freelancer works with
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                {skills.length} skills
              </span>
            </div>

            {skills.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No specific skill tags added yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-2xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall Deliverables Completed: <strong className="text-foreground">{completedTasks.length}</strong></span>
              <span>Total Value Delivered: <strong className="text-teal-600 dark:text-teal-400 font-mono font-bold">{inr(totalEarnings)}</strong></span>
            </div>
          </div>

          {/* Resume PDF Section */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Resume / CV</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Candidates attach their complete PDF resume for client review before task assignment.
              </p>
            </div>

            {profile.resume_url ? (
              <div className="pt-2">
                <a
                  href={profile.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>Open PDF Resume</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  No resume PDF uploaded yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Task History Showcase */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Task History &amp; Milestones ({taskList.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Past and current task assignments on TaskForge
              </p>
            </div>
          </div>

          {taskList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h4 className="text-xs font-bold text-foreground">No tasks assigned yet</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                When this freelancer is selected for tasks, their deliverable track record will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {taskList.map((t) => {
                const statusCfg = TASK_STATUS[t.status] ?? {
                  label: t.status,
                  className: "bg-slate-100",
                };
                const projectTitle =
                  Array.isArray(t.projects)
                    ? t.projects[0]?.title
                    : (t.projects as any)?.title ?? "Project";

                return (
                  <div
                    key={t.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {t.title}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Project: <strong className="text-foreground">{projectTitle}</strong>
                        {t.created_at && (
                          <span>
                            {" "}• Assigned on{" "}
                            {new Date(t.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                        {inr(t.reward_amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
