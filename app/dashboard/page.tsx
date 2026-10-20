import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/NotificationBell";
import { updateSkills } from "./actions";
import {
  Briefcase,
  Search,
  Send,
  CheckCircle,
  Plus,
  LogOut,
  Wallet as WalletIcon,
  Sparkles,
  ArrowRight,
  Clock,
  IndianRupee,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
  breakdown_ready: { label: "Breakdown Ready", className: "bg-blue-50 text-blue-700 border-blue-200" },
  published: { label: "Published", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", className: "bg-purple-50 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-200" },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, skills")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "freelancer";
  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";

  const { data: projects } =
    role === "client"
      ? await supabase
          .from("projects")
          .select("id, title, status, total_budget, created_at")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { count: waitingApplicants } =
    role === "client"
      ? await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : { count: 0 };

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

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-sm">
                TF
              </span>
              <span>TaskForge</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/dashboard"
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-900"
              >
                Dashboard
              </Link>
              {role === "freelancer" && (
                <>
                  <Link
                    href="/marketplace"
                    className="rounded-lg px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Marketplace
                  </Link>
                  <Link
                    href="/my-tasks"
                    className="rounded-lg px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    My Tasks
                  </Link>
                  <Link
                    href="/applications"
                    className="rounded-lg px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Applications
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />

            <Link
              href="/wallet"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <WalletIcon className="h-4 w-4 text-emerald-600" />
              <span>Wallet</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 leading-tight">{displayName}</p>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                  {role}
                </span>
              </div>
            </div>

            <form action="/auth/signout" method="post">
              <button
                className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome back, {displayName}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {role === "client"
                ? "Manage your projects, review applicants, and fund milestones."
                : "Browse open tasks, track your applications, and deliver work."}
            </p>
          </div>

          {role === "client" && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-all hover:shadow"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Link>
          )}
        </div>

        {/* Client View */}
        {role === "client" ? (
          <div className="space-y-6">
            {(waitingApplicants ?? 0) > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">
                    {waitingApplicants} applicant{waitingApplicants === 1 ? "" : "s"} waiting for your review
                  </p>
                  <p className="text-amber-700/80 text-xs mt-0.5">
                    Open a published project to select a freelancer and assign tasks.
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
                <span className="text-xs text-gray-500 font-medium">
                  {projects?.length ?? 0} {projects?.length === 1 ? "project" : "projects"}
                </span>
              </div>

              {!projects || projects.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">No projects created yet</h3>
                  <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                    Start by creating a project, break it into manageable tasks, and fund them securely through escrow.
                  </p>
                  <Link
                    href="/projects/new"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create First Project
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((p) => {
                    const statusCfg = STATUS_CONFIG[p.status] ?? {
                      label: p.status,
                      className: "bg-gray-100 text-gray-700 border-gray-200",
                    };
                    return (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.className}`}
                            >
                              {statusCfg.label}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(p.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                            {p.title}
                          </h3>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <span className="font-mono tabular-nums font-medium text-gray-700">
                            {p.total_budget > 0
                              ? `₹${Number(p.total_budget).toLocaleString("en-IN")}`
                              : "No cap"}
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                            View <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Freelancer View */
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/marketplace"
                className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Open Marketplace
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Search className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-gray-900">
                  {openTaskCount ?? 0}
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  Browse tasks <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>

              <Link
                href="/applications"
                className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    My Applications
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Send className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-gray-900">
                  {pendingAppCount ?? 0}
                </p>
                <p className="mt-1 text-xs text-blue-600 font-medium flex items-center gap-1">
                  Pending review <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>

              <Link
                href="/my-tasks"
                className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Active Tasks
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-gray-900">
                  {activeTaskCount ?? 0}
                </p>
                <p className="mt-1 text-xs text-purple-600 font-medium flex items-center gap-1">
                  Work in progress <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>
            </div>

            {/* Skills Form */}
            <form
              action={updateSkills}
              className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Your Skills</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Add tags (comma separated). The marketplace highlights tasks matching these skills with a green badge.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  {(profile?.skills ?? []).length} saved
                </span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
                <input
                  name="skills"
                  defaultValue={(profile?.skills ?? []).join(", ")}
                  placeholder="e.g. nextjs, typescript, tailwind, ui design, supabase"
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <button className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors">
                  Save Skills
                </button>
              </div>

              {(profile?.skills ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(profile?.skills ?? []).map((skill: string) => (
                    <span
                      key={skill}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
