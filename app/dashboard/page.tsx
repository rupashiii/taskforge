import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSkills } from "./actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { UpdateResumeForm } from "@/components/UpdateResumeForm";
import { computeFreelancerRating, getFreelancerStats } from "@/lib/rating";
import {
  Star,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Briefcase,
  Award,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
  Lock,
  ArrowUpRight,
} from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
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

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, skills, avatar_url, resume_url, rating")
    .eq("id", user.id)
    .single();

  const metaRole = (user.user_metadata?.role as string) || null;
  let role = profile?.role ?? metaRole ?? "freelancer";

  // If user signed up with client metadata but profile was initialized as freelancer (or vice versa), sync them:
  if (metaRole && profile && profile.role !== metaRole) {
    role = metaRole;
    await supabase.from("profiles").update({ role: metaRole }).eq("id", user.id);
  }

  const { data: projects } =
    role === "client"
      ? await supabase
          .from("projects")
          .select("id, title, status, total_budget, created_at")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: walletSummaryRaw } = await supabase.rpc("wallet_summary");
  const walletSummary = (walletSummaryRaw ?? {}) as {
    available?: number;
    escrow?: number;
    earned?: number;
  };

  // Client: pending applicants across all of their tasks (row level security limits this)
  const { count: waitingApplicants } =
    role === "client"
      ? await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : { count: 0 };

  // Freelancer counters
  const { count: openTaskCount } =
    role === "freelancer"
      ? await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
      : { count: 0 };

  const { count: pendingAppCount } =
    role === "freelancer"
      ? await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("freelancer_id", user.id)
          .eq("status", "pending")
      : { count: 0 };

  const { count: activeTaskCount } =
    role === "freelancer"
      ? await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .in("status", ["assigned", "in_progress", "revision_requested"])
      : { count: 0 };

  // ─── Freelancer rating data (matches /freelancers/[id] calculation) ───
  let acceptedCount = 0;
  let rejectedCount = 0;
  let needsReviewCount = 0;
  let totalTasksAssigned = 0;
  let totalEarned = 0;
  let dynRating = computeFreelancerRating(0, 0);

  if (role === "freelancer") {
    const stats = await getFreelancerStats(supabase, user.id);
    acceptedCount = stats.acceptedCount;
    rejectedCount = stats.rejectedCount;
    needsReviewCount = stats.askedForReviewCount;
    totalTasksAssigned = stats.totalTasksAssigned;
    totalEarned = stats.totalEarned;
    dynRating = stats.rating;
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Task<span className="text-primary">Forge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-xs"
            >
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Wallet</span>
            </Link>
            <ThemeToggle />
            <NotificationBell userId={user.id} />
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {(profile?.full_name ?? user.email ?? "U")[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground">
                {profile?.full_name || user.email}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {role}
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* ── Welcome banner ── */}
        <section className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "client"
              ? "Manage your projects, review applicants, and track task progress."
              : "Find tasks, submit work, and grow your reputation on TaskForge."}
          </p>
        </section>

        {/* ════════════════════ FREELANCER DASHBOARD ════════════════════ */}
        {role === "freelancer" && (
          <>
            {/* ── Profile card with rating ── */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Avatar */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-400 text-2xl font-bold text-white shadow-md">
                  {(profile?.full_name ?? "U")[0].toUpperCase()}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {profile?.full_name || user.email}
                    </h2>
                    <p className="text-sm text-muted-foreground capitalize flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      Freelancer
                      {dynRating.isNew && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          <ShieldCheck className="h-3 w-3" />
                          New Talent
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Rating badge */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <span className="text-lg font-bold text-foreground">
                        {dynRating.formatted}
                      </span>
                      <span className="text-xs text-muted-foreground">/5.0</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dynRating.label}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                      <span className="font-semibold text-foreground">
                        {acceptedCount}
                      </span>
                      <span className="text-muted-foreground">Accepted</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="font-semibold text-foreground">
                        {rejectedCount}
                      </span>
                      <span className="text-muted-foreground">Rejected</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs">
                      <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-semibold text-foreground">
                        {needsReviewCount}
                      </span>
                      <span className="text-muted-foreground">In Review</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-foreground">
                        {totalTasksAssigned}
                      </span>
                      <span className="text-muted-foreground">Total Tasks</span>
                    </div>
                    {totalEarned > 0 && (
                      <div className="flex items-center gap-1.5 rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 px-2.5 py-1 text-xs">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          {inr(totalEarned)}
                        </span>
                        <span className="text-teal-600/70 dark:text-teal-400/70">
                          Earned
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {(profile?.skills ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(profile?.skills ?? []).map((s: string) => (
                        <span
                          key={s}
                          className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* View public profile link */}
                <Link
                  href={`/freelancers/${user.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  View Profile
                </Link>
              </div>
            </section>

            {/* ── Quick action cards ── */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/marketplace"
                className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Marketplace
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {openTaskCount ?? 0}
                </p>
                <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  open tasks →
                </p>
              </Link>
              <Link
                href="/applications"
                className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  My Applications
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {pendingAppCount ?? 0}
                </p>
                <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  pending review →
                </p>
              </Link>
              <Link
                href="/my-tasks"
                className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  My Tasks
                </p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {activeTaskCount ?? 0}
                </p>
                <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  active →
                </p>
              </Link>
            </div>

            {/* ── Resume upload ── */}
            <UpdateResumeForm
              userId={user.id}
              currentResumeUrl={profile?.resume_url ?? null}
            />

            {/* ── Skills editor ── */}
            <form
              action={updateSkills}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h2 className="text-sm font-bold text-foreground">Your Skills</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Comma separated. The marketplace highlights tasks that match
                them.
              </p>
              <div className="mt-3 flex gap-3">
                <input
                  name="skills"
                  defaultValue={(profile?.skills ?? []).join(", ")}
                  placeholder="e.g. figma, ui, frontend, backend"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                  Save
                </button>
              </div>
            </form>
          </>
        )}

        {/* ════════════════════ CLIENT DASHBOARD ════════════════════ */}
        {role === "client" && (
          <>
            {(waitingApplicants ?? 0) > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">
                  {waitingApplicants} applicant
                  {waitingApplicants === 1 ? "" : "s"}
                </span>{" "}
                waiting for review. Open a published project to choose a
                freelancer.
              </div>
            )}

            {/* ── Client Wallet & Escrow Overview ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available Wallet Balance
                  </p>
                  <p className="mt-1 text-2xl font-bold font-mono text-primary">
                    {inr(walletSummary.available ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ready to lock into escrow for tasks
                  </p>
                </div>
                <Link
                  href="/wallet"
                  className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 text-xs font-semibold transition-colors shrink-0"
                >
                  + Add Funds
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3 text-amber-500" />
                    Held in Escrow
                  </p>
                  <p className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {inr(walletSummary.escrow ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Secured for published tasks in progress
                  </p>
                </div>
                <Link
                  href="/wallet"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <span>Ledger</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Your Projects
              </h2>
              <Link
                href="/projects/new"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                + New project
              </Link>
            </div>

            {!projects || projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                <p>No projects yet.</p>
                <Link
                  href="/projects/new"
                  className="mt-2 inline-block font-medium text-primary underline"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {projects.map((p) => {
                  const st = STATUS_LABEL[p.status] ?? {
                    label: p.status,
                    className: "bg-muted text-muted-foreground border-border",
                  };
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                      >
                        <div>
                          <p className="font-semibold text-foreground">
                            {p.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("en-IN")}
                            {p.total_budget > 0 &&
                              ` · up to ${inr(p.total_budget)}`}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
