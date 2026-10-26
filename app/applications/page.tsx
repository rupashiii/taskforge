import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withdrawApplication } from "../marketplace/actions";
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  AlertCircle,
  Trash2
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

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, message, created_at, tasks(id, title, reward_amount, status)")
    .eq("freelancer_id", user.id)
    .order("created_at", { ascending: false });

  const list = applications ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Task Pitches &amp; Bids
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Monitor the evaluation status of your proposals submitted across marketplace tasks.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors self-start sm:self-auto shrink-0"
          >
            <span>Browse More Tasks</span>
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <h3 className="text-sm font-bold text-foreground">No pitches submitted yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Find open tasks in the marketplace that match your skillset and submit your proposal.
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {list.map((a) => {
              const task = one<{
                id: string;
                title: string;
                reward_amount: number;
                status: string;
              }>(a.tasks as any);
              const statusCfg = APP_STATUS[a.status] ?? {
                label: a.status,
                className: "bg-slate-100 text-slate-700 border-slate-200",
              };

              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      {task ? (
                        <Link
                          href={`/marketplace/${task.id}`}
                          className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{task.title}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">Task no longer available</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                        Applied on {new Date(a.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      {task && (
                        <span className="text-base font-bold font-mono text-teal-600 dark:text-teal-400 block">
                          {inr(task.reward_amount)}
                        </span>
                      )}
                      <span
                        className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-semibold mt-1 ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-border p-3.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Your Application Pitch:
                    </p>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {a.message}
                    </p>
                  </div>

                  {a.status === "pending" && (
                    <div className="pt-2 flex justify-end">
                      <form action={withdrawApplication}>
                        <input type="hidden" name="applicationId" value={a.id} />
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer">
                          <Trash2 className="h-3 w-3" />
                          <span>Withdraw Application</span>
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
  );
}
