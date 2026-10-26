import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptApplication } from "./actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { computeFreelancerRating, getFreelancerStats } from "@/lib/rating";
import {
  Star,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  User,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const APP_STATUS: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  accepted: {
    label: "Selected",
    className:
      "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  rejected: {
    label: "Not selected",
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
  withdrawn: {
    label: "Withdrawn",
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
  },
};

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; taskId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, taskId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id")
    .eq("id", id)
    .single();

  if (!project || project.client_id !== user.id) notFound();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, reward_amount, status, skills_required, assigned_to")
    .eq("id", taskId)
    .eq("project_id", id)
    .single();

  if (!task) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, message, created_at, freelancer_id")
    .eq("task_id", taskId)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: true });

  const appList = applications ?? [];
  const freelancerIds = appList.map((a) => a.freelancer_id);

  const { data: people } = freelancerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, skills, rating, resume_url")
        .in("id", freelancerIds)
    : { data: [] };

  const personById = new Map<
    string,
    {
      full_name: string | null;
      skills: string[] | null;
      rating: number | null;
      resume_url: string | null;
    }
  >((people ?? []).map((p: any) => [p.id, p]));

  // ── Compute dynamic rating for each freelancer ──
  const ratingById = new Map<string, ReturnType<typeof computeFreelancerRating>>();
  for (const fId of freelancerIds) {
    const stats = await getFreelancerStats(supabase, fId);
    ratingById.set(fId, stats.rating);
  }

  const taskSkills = new Set<string>(task.skills_required ?? []);
  const isOpen = task.status === "open";

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
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {project.title}
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Applicants for
            </p>
            <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-foreground">
              {inr(task.reward_amount)}
            </p>
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {isOpen ? "Open" : task.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {!isOpen && (
          <p className="mt-4 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-3 text-sm text-teal-800 dark:text-teal-300">
            A freelancer has been selected for this task.
          </p>
        )}

        {appList.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No applications yet. Freelancers will appear here when they apply.
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {appList.map((a) => {
              const person = personById.get(a.freelancer_id);
              const skills: string[] = person?.skills ?? [];
              const status = APP_STATUS[a.status] ?? {
                label: a.status,
                className: "bg-muted text-muted-foreground border-border",
              };
              const dynRating = ratingById.get(a.freelancer_id);

              return (
                <li
                  key={a.id}
                  className={`rounded-xl border bg-card p-5 transition-all ${
                    a.status === "accepted"
                      ? "border-teal-500 dark:border-teal-400 shadow-md"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-400 text-sm font-bold text-white">
                        {(person?.full_name ?? "F")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-foreground">
                            {person?.full_name || "Freelancer"}
                          </p>
                          {/* Profile link */}
                          <Link
                            href={`/freelancers/${a.freelancer_id}`}
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                          >
                            <User className="h-3 w-3" />
                            Profile
                          </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Applied{" "}
                          {new Date(a.created_at).toLocaleDateString("en-IN")}
                        </p>

                        {/* Dynamic rating badge */}
                        {dynRating && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5">
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  dynRating.isNew
                                    ? "text-slate-400"
                                    : "text-amber-500 fill-amber-500"
                                }`}
                              />
                              <span className="text-xs font-bold text-foreground">
                                {dynRating.formatted}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {dynRating.isNew
                                ? "New Talent"
                                : dynRating.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className={`rounded-full border px-2.5 py-0.5 ${
                            taskSkills.has(s)
                              ? "border-primary bg-primary text-primary-foreground font-semibold"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.message}
                  </p>

                  {/* Resume link */}
                  {person?.resume_url && (
                    <a
                      href={person.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      📄 View Resume
                    </a>
                  )}

                  {isOpen && a.status === "pending" && (
                    <form action={acceptApplication} className="mt-4">
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="taskId" value={taskId} />
                      <input
                        type="hidden"
                        name="applicationId"
                        value={a.id}
                      />
                      <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                        Select this freelancer
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isOpen && appList.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Selecting a freelancer assigns the task to them and marks every other
            pending application as not selected.
          </p>
        )}
      </div>
    </main>
  );
}
