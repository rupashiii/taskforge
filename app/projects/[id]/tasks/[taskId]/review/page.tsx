import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewSubmission } from "./actions";
import SubmissionHistory, { type HistoryItem } from "@/components/submission-history";
import FinalFilesPanel from "@/components/FinalFilesPanel";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  RotateCcw,
  ExternalLink,
  Globe,
  FileText,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function SafeLink({ url }: { url: string }) {
  if (/^https?:\/\//i.test(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 break-all text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
      >
        <span>{url}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  return <span className="break-all text-xs font-mono text-muted-foreground">{url}</span>;
}

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
    .select("id, version, preview_links, preview_notes, preview_demo_url, final_unlocked, created_at, freelancer_id")
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
      links: s.preview_links ?? [],
      notes: s.preview_notes,
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
    <div className="min-h-screen bg-background text-foreground py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to {project.title}</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Review Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Deliverable Verification · Submitted by{" "}
              {latest?.freelancer_id ? (
                <Link
                  href={`/freelancers/${latest.freelancer_id}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {freelancerName} (View Profile)
                </Link>
              ) : (
                freelancerName
              )}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {task.title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Revisions cycle: <strong className="text-foreground">{revisionsUsed} used</strong> of {revisionsMax} maximum allowed.
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
              Escrow Payout On Approval
            </span>
            <span className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
              {inr(task.reward_amount)}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Submission Deliverables */}
        {latest && (
          <div className="space-y-4">
            {/* ── Section A: Preview Package ── */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
                    v{latest.version}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Section A — Preview Package
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Submitted on{" "}
                      {new Date(latest.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                  Preview Available
                </span>
              </div>

              {/* Live Demo URL */}
              {latest.preview_demo_url && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-card p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white shrink-0">
                      Live Working Demo:
                    </span>
                    <a
                      href={latest.preview_demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {latest.preview_demo_url}
                    </a>
                  </div>
                  <a
                    href={latest.preview_demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 shrink-0 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    <span>Open Demo</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Preview Links */}
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
                  Preview Links &amp; Proof of Work ({latest.preview_links?.length ?? 0}):
                </p>
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-3.5">
                  {(latest.preview_links ?? []).map((l: string, i: number) => (
                    <div key={i}>
                      <SafeLink url={l} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Notes */}
              {latest.preview_notes && (
                <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span>Freelancer Preview Notes:</span>
                  </p>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {latest.preview_notes}
                  </p>
                </div>
              )}
            </div>

            {/* ── Section B: Final Deliverable Package ── */}
            <FinalFilesPanel
              submissionId={latest.id}
              unlocked={Boolean(latest.final_unlocked)}
            />
          </div>
        )}

        {/* Acceptance Criteria Checklist (client side verify) */}
        {criteria.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Acceptance Criteria Verification
              </h2>
              <span className="text-[11px] text-muted-foreground">
                Interactive scratchpad (check off as you test)
              </span>
            </div>
            <ul className="space-y-2 text-xs text-foreground/90">
              {criteria.map((c, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-input text-teal-600 focus:ring-teal-500/20 cursor-pointer"
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
          <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/20 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Your Evaluation &amp; Payout Decision</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review the preview package above. Accepting will immediately release the held escrow reward and unlock the original deliverable files.
              </p>
            </div>

            <form action={reviewSubmission} className="space-y-4.5">
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="taskId" value={taskId} />
              <input type="hidden" name="submissionId" value={latest.id} />

              <div className="grid gap-2.5 sm:grid-cols-3">
                <label className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 dark:hover:bg-teal-950/30 transition-all has-checked:border-teal-600 has-checked:ring-1 has-checked:ring-teal-600 has-checked:bg-teal-50/50 dark:has-checked:bg-teal-950/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span>Accept</span>
                    </span>
                    <input
                      type="radio"
                      name="decision"
                      value="approve"
                      required
                      className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Deliverables meet requirements. Releases escrow payment and unlocks the original deliverable package immediately.
                  </span>
                </label>

                <label
                  className={`flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all ${
                    revisionsLeft <= 0
                      ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900"
                      : "cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 dark:hover:bg-amber-950/30 has-checked:border-amber-600 has-checked:ring-1 has-checked:ring-amber-600 has-checked:bg-amber-50/50 dark:has-checked:bg-amber-950/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4 text-amber-500" />
                      <span>Request Revision</span>
                    </span>
                    <input
                      type="radio"
                      name="decision"
                      value="revision"
                      disabled={revisionsLeft <= 0}
                      className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {revisionsLeft > 0
                      ? `${revisionsLeft} revision(s) remaining. Files stay locked; freelancer resubmits both packages.`
                      : "Revision cap reached (3 of 3). Accept or decline."}
                  </span>
                </label>

                <label className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-red-500 hover:bg-red-50/20 dark:hover:bg-red-950/30 transition-all has-checked:border-red-600 has-checked:ring-1 has-checked:ring-red-600 has-checked:bg-red-50/50 dark:has-checked:bg-red-950/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Decline</span>
                    </span>
                    <input
                      type="radio"
                      name="decision"
                      value="decline"
                      className="text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Work does not fulfill criteria. No payment released; original files stay locked. Choose refund or reopen below.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Detailed Feedback Notes{" "}
                  <span className="text-muted-foreground font-normal lowercase">
                    (mandatory if requesting revision or declining)
                  </span>
                </label>
                <textarea
                  name="feedback"
                  rows={3}
                  maxLength={2000}
                  placeholder="Explain clearly what requires modification or why the deliverable is declined..."
                  className="w-full rounded-md border border-input bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  If Declined, What Happens to This Milestone?
                </label>
                <select
                  name="reopen"
                  defaultValue="1"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors cursor-pointer"
                >
                  <option value="1">Reopen milestone on marketplace for new freelancers (escrow stays reserved)</option>
                  <option value="0">Close milestone and refund reserved escrow back to my wallet</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Declining terminates this submission cycle. Original files will remain permanently locked and inaccessible.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Submit Evaluation</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-xs text-muted-foreground">
            {task.status === "revision_requested"
              ? "Awaiting the freelancer to submit an updated deliverable revision."
              : task.status === "completed"
              ? "✓ This task is completed and escrow funds have been released."
              : "No deliverables currently pending review."}
          </div>
        )}

        {/* All Submissions History */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Submission History ({history.length} versions)
          </h2>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No submissions uploaded yet.</p>
          ) : (
            <SubmissionHistory items={history} />
          )}
        </div>
      </div>
    </div>
  );
}
