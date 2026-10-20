import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptApplication } from "./actions";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Star,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  UserCheck,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const APP_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Decision", className: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { label: "Selected & Assigned", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Not Selected", className: "bg-gray-100 text-gray-500 border-gray-200" },
  withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-400 border-gray-200" },
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
        .select("id, full_name, skills, rating")
        .in("id", freelancerIds)
    : { data: [] };

  const personById = new Map<
    string,
    { full_name: string | null; skills: string[] | null; rating: number | null }
  >((people ?? []).map((p: any) => [p.id, p]));

  const taskSkills = new Set<string>(task.skills_required ?? []);
  const isOpen = task.status === "open";

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to project</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <span className="text-xs font-medium text-gray-400">
              Project: {project.title} · Review Applicants
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-1">
              {task.title}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] uppercase font-semibold text-gray-400 block">
              Task Reward
            </span>
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
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

        {!isOpen && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs font-medium text-blue-800 shadow-sm">
            <UserCheck className="h-4 w-4 shrink-0 text-blue-600" />
            <span>
              This task is no longer open for selection. It is currently in {task.status.replace("_", " ")} status.
            </span>
          </div>
        )}

        {/* Applicants List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Applicants ({appList.length})
          </h2>

          {appList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900">No applicants yet</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Freelancers browsing the marketplace will see this task and submit pitches. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {appList.map((a) => {
                const person = personById.get(a.freelancer_id);
                const skills: string[] = person?.skills ?? [];
                const statusCfg = APP_STATUS[a.status] ?? {
                  label: a.status,
                  className: "bg-gray-100",
                };
                const matchingSkills = skills.filter((s) => taskSkills.has(s));

                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm space-y-3 transition-all ${
                      a.status === "accepted"
                        ? "border-emerald-500 ring-2 ring-emerald-500/10"
                        : "border-gray-200/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">
                            {person?.full_name ?? "Freelancer"}
                          </h3>
                          {person?.rating && (
                            <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {person.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Applied {new Date(a.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <span
                        className={`self-start sm:self-auto rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Pitch Message */}
                    <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-3.5">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Freelancer Pitch:
                      </p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {a.message}
                      </p>
                    </div>

                    {/* Skills pills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-gray-400 mr-1">Skills:</span>
                        {skills.map((s) => {
                          const isMatch = taskSkills.has(s);
                          return (
                            <span
                              key={s}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                isMatch
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {isMatch ? `✓ ${s}` : s}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Action Button */}
                    {isOpen && a.status === "pending" && (
                      <div className="pt-2 flex justify-end">
                        <form action={acceptApplication}>
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="taskId" value={taskId} />
                          <input type="hidden" name="applicationId" value={a.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Select this Freelancer &amp; Lock In</span>
                          </button>
                        </form>
                      </div>
                    )}
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
