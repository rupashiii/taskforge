import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewSubmission } from "./actions";
import SubmissionHistory, { type HistoryItem } from "@/components/submission-history";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  AlertCircle,
  Check,
  RotateCcw,
  Shield,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

export default async function ReviewPage({
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
    .select(
      "id, title, status, reward_amount, acceptance_criteria, revision_count, max_revisions, assigned_to"
    )
    .eq("id", taskId)
    .eq("project_id", id)
    .single();

  if (!task) notFound();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, version, links, notes, created_at, freelancer_id")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  const subList = (submissions ?? []) as any[];
  const subIds = subList.map((s) => s.id);

  const { data: reviews } = subIds.length
    ? await supabase
        .from("reviews")
        .select("submission_id, decision, feedback, created_at")
        .in("submission_id", subIds)
    : { data: [] };

  const reviewBySub = new Map<string, any>(
    (reviews ?? []).map((r: any) => [r.submission_id, r])
  );

  const history: HistoryItem[] = subList.map((s) => {
    const r = reviewBySub.get(s.id);
    return {
      id: s.id,
      version: s.version,
      created_at: s.created_at,
      links: s.links ?? [],
      notes: s.notes,
      review: r
        ? { decision: r.decision, feedback: r.feedback, created_at: r.created_at }
        : null,
    };
  });

  const latest = subList[0];
  const canReview = task.status === "submitted" && Boolean(latest);

  let freelancerName = "Freelancer";
  if (latest?.freelancer_id) {
    const { data: person } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", latest.freelancer_id)
      .single();
    if (person?.full_name) freelancerName = person.full_name;
  }

  const revisionsUsed = task.revision_count ?? 0;
  const revisionsMax = task.max_revisions ?? 3;
  const revisionsLeft = revisionsMax - revisionsUsed;
  const criteria: string[] = task.acceptance_criteria ?? [];

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to {project.title}</span>
        </Link>

        {/* Review Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <span className="text-xs font-medium text-gray-400">
              Deliverable Review · Submitted by {freelancerName}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-1">
              {task.title}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Revisions cycle: {revisionsUsed} used of {revisionsMax} allowed.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] uppercase font-semibold text-gray-400 block">
              Escrow Payout
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

        {/* Acceptance Criteria Checklist (client side verify) */}
        {criteria.length > 0 && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Acceptance Criteria Checklist
              </h2>
              <span className="text-[11px] text-gray-400">
                Interactive scratchpad (not saved)
              </span>
            </div>
            <ul className="space-y-2 text-xs text-gray-700">
              {criteria.map((c, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{c}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Review Decision Form */}
        {canReview ? (
          <div className="rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Your Review Decision</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Approving will immediately release the escrow reward to the freelancer's wallet.
              </p>
            </div>

            <form action={reviewSubmission} className="space-y-4">
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="taskId" value={taskId} />
              <input type="hidden" name="submissionId" value={latest.id} />

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="flex flex-col justify-between rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-all has-checked:border-emerald-600 has-checked:bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Approve</span>
                    </span>
                    <input
                      type="radio"
                      name="decision"
                      value="approve"
                      required
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 leading-tight">
                    Work satisfies all criteria. Release escrow payment.
                  </span>
                </label>

                <label
                  className={`flex flex-col justify-between rounded-xl border border-gray-200 p-4 transition-all ${
                    revisionsLeft <= 0
                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                      : "cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 has-checked:border-amber-600 has-checked:bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                      <span>Request Revision</span>
                    </span>
                    <input
                      type="radio"
                      name="decision"
                      value="revision"
                      disabled={revisionsLeft <= 0}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 leading-tight">
                    {revisionsLeft > 0
                      ? `${revisionsLeft} revision(s) remaining. Feedback required.`
                      : "Revision cap reached (3 of 3). Approve or reject."}
                  </span>
                </label>

                <label className="flex flex-col justify-between rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all has-checked:border-red-600 has-checked:bg-red-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>Reject</span>
                    </span>
                    <input
                      type="radio"
                      name="decision"
                      value="reject"
                      className="text-red-600 focus:ring-red-500"
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 leading-tight">
                    Work does not meet standards. Feedback required.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Feedback Notes{" "}
                  <span className="text-gray-400 font-normal">
                    (Required if requesting revisions or rejecting)
                  </span>
                </label>
                <textarea
                  name="feedback"
                  rows={3}
                  maxLength={2000}
                  placeholder="Explain clearly what needs adjustments or why the deliverable failed criteria..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  If Rejected, What Happens to This Task?
                </label>
                <select
                  name="reopen"
                  defaultValue="1"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                >
                  <option value="1">Reopen on marketplace for other freelancers (Escrow stays held)</option>
                  <option value="0">Cancel task and refund escrow back to my wallet</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Submit Review Decision</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-xs text-gray-500">
            {task.status === "revision_requested"
              ? "Awaiting the freelancer to submit an updated deliverable revision."
              : task.status === "completed"
              ? "This task is completed and funds have been released."
              : "No deliverables currently pending review."}
          </div>
        )}

        {/* All Submissions History */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">
            Submission History ({history.length} versions)
          </h2>
          {history.length === 0 ? (
            <p className="text-xs text-gray-400">No submissions uploaded yet.</p>
          ) : (
            <SubmissionHistory items={history} />
          )}
        </div>
      </div>
    </div>
  );
}
