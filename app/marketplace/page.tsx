import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Search,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type SearchParams = {
  q?: string;
  skill?: string;
  min?: string;
  sort?: string;
  match?: string;
  error?: string;
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, skills")
    .eq("id", user.id)
    .single();

  const mySkills: string[] = profile?.skills ?? [];
  const mySkillSet = new Set(mySkills);

  let query = supabase
    .from("tasks")
    .select(
      "id, title, description, skills_required, complexity, estimated_hours, reward_amount, deadline, created_at, projects(title)"
    )
    .eq("status", "open");

  const q = (sp.q ?? "").replace(/[,()%*]/g, " ").trim();
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const skill = (sp.skill ?? "").trim().toLowerCase();
  if (skill) query = query.contains("skills_required", [skill]);

  const min = Number(sp.min);
  if (sp.min && !Number.isNaN(min) && min > 0) query = query.gte("reward_amount", min);

  if (sp.match === "1" && mySkills.length > 0)
    query = query.overlaps("skills_required", mySkills);

  if (sp.sort === "reward_high") query = query.order("reward_amount", { ascending: false });
  else if (sp.sort === "reward_low") query = query.order("reward_amount", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data: tasks } = await query;
  const taskList = tasks ?? [];

  const { data: myApps } = await supabase
    .from("applications")
    .select("task_id, status")
    .eq("freelancer_id", user.id);

  const appliedIds = new Set(
    (myApps ?? []).filter((a) => a.status !== "withdrawn").map((a) => a.task_id)
  );

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300 mb-1">
              <Sparkles className="h-3 w-3" />
              Verified Escrow Funds
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Task Marketplace
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Browse funded micro-tasks, submit tailored proposals, and earn upon milestone completion.
            </p>
          </div>
          <span className="text-xs font-semibold font-mono rounded-md border border-border bg-card px-3 py-1.5 text-foreground">
            {taskList.length} open {taskList.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {sp.error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs font-medium text-red-700 dark:text-red-400">
            {sp.error}
          </div>
        )}

        {/* Filters */}
        <form
          method="get"
          className="rounded-xl border border-border bg-card p-4.5 space-y-3.5 shadow-xs"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={sp.q}
                placeholder="Search deliverables, specs, keywords…"
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
              />
            </div>
            <input
              name="skill"
              defaultValue={sp.skill}
              placeholder="Skill (e.g. react, postgres)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
            />
            <select
              name="sort"
              defaultValue={sp.sort ?? "newest"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="reward_high">Reward: High → Low</option>
              <option value="reward_low">Reward: Low → High</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                type="checkbox"
                name="match"
                value="1"
                defaultChecked={sp.match === "1"}
                className="rounded border-input text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              Filter tasks matching my profile skills
              {mySkills.length === 0 && (
                <span className="text-muted-foreground font-normal">(add skills on dashboard first)</span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <Link
                href="/marketplace"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Reset
              </Link>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>

        {/* Task list */}
        {taskList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <h3 className="text-sm font-bold text-foreground">No open tasks matched your filters</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try broadening your search keywords or resetting the skills filter.
            </p>
            <Link
              href="/marketplace"
              className="inline-block rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Clear All Filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {taskList.map((t) => {
              const project = one<{ title: string }>(t.projects as any);
              const skills: string[] = t.skills_required ?? [];
              const isMatch = skills.some((s) => mySkillSet.has(s));
              const isApplied = appliedIds.has(t.id);
              const isExpired = t.deadline
                ? new Date(t.deadline).setHours(23, 59, 59, 999) < Date.now()
                : false;

              return (
                <Link
                  key={t.id}
                  href={`/marketplace/${t.id}`}
                  className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4.5 hover:border-blue-500/50 hover:shadow-xs transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground line-clamp-1">
                        {project?.title ?? "Project"}
                      </span>
                      {isApplied ? (
                        <span className="shrink-0 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                          Pitch Submitted
                        </span>
                      ) : isExpired ? (
                        <span className="shrink-0 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          Expired
                        </span>
                      ) : isMatch ? (
                        <span className="shrink-0 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          Skill Match
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-1 transition-colors">
                      {t.title}
                    </h2>

                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            mySkillSet.has(s)
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                              : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="text-[10px] text-muted-foreground font-mono">+{skills.length - 4}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold font-mono text-teal-600 dark:text-teal-400">
                        {inr(t.reward_amount)}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {t.estimated_hours && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="h-3 w-3" />
                            {t.estimated_hours}h
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                          Inspect <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
