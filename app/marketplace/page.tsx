import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  Clock,
  Calendar,
  Layers,
  CheckCircle,
  Tag,
  AlertCircle,
} from "lucide-react";

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
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to dashboard</span>
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <span>Task Marketplace</span>
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Browse funded micro-tasks with guaranteed escrow payouts. Apply directly with your pitch.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            {taskList.length} open {taskList.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {sp.error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{sp.error}</span>
          </div>
        )}

        {/* Filters Form */}
        <form
          method="get"
          className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                name="q"
                defaultValue={sp.q}
                placeholder="Search by keywords..."
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <input
                name="skill"
                defaultValue={sp.skill}
                placeholder="Skill (e.g. figma, react)"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <select
                name="sort"
                defaultValue={sp.sort ?? "newest"}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
              >
                <option value="newest">Newest first</option>
                <option value="reward_high">Reward: High to Low</option>
                <option value="reward_low">Reward: Low to High</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                name="match"
                value="1"
                defaultChecked={sp.match === "1"}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Only show tasks matching my skills</span>
              {mySkills.length === 0 && (
                <span className="text-gray-400 font-normal">
                  (add skills on dashboard first)
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <Link
                href="/marketplace"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Reset
              </Link>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>

        {/* Task Cards Grid */}
        {taskList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <Filter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No open tasks found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Try adjusting your search filters or clear the skills match checkbox.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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
                  className="group flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-[11px] font-medium text-gray-400 line-clamp-1">
                        {project?.title ?? "Project"}
                      </span>
                      {isApplied ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Applied
                        </span>
                      ) : isExpired ? (
                        <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Expired
                        </span>
                      ) : isMatch ? (
                        <span className="shrink-0 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          Skill Match
                        </span>
                      ) : null}
                    </div>

                    <h2 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {t.title}
                    </h2>

                    <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            mySkillSet.has(s)
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400">
                          +{skills.length - 4}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold font-mono tabular-nums text-emerald-600">
                        {inr(t.reward_amount)}
                      </span>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {t.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t.estimated_hours}h
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                          Details <ArrowRight className="h-3 w-3" />
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
