import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withdrawApplication } from "../marketplace/actions";
import {
  ArrowLeft,
  Briefcase,
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const APP_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  accepted: { label: "Accepted 🎉", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Not Selected", className: "bg-gray-100 text-gray-500 border-gray-200" },
  withdrawn: { label: "Withdrawn", className: "bg-gray-100 text-gray-400 border-gray-200" },
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
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to dashboard</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              My Task Applications
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Track the status of your task bids and pitch messages.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors self-start sm:self-auto"
          >
            <span>Browse More Tasks</span>
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {list.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No applications submitted yet</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Find open tasks in the marketplace that match your skillset and submit an application.
            </p>
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((a) => {
              const task = one<{
                id: string;
                title: string;
                reward_amount: number;
                status: string;
              }>(a.tasks as any);
              const statusCfg = APP_STATUS[a.status] ?? {
                label: a.status,
                className: "bg-gray-100 text-gray-700 border-gray-200",
              };

              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      {task ? (
                        <Link
                          href={`/marketplace/${task.id}`}
                          className="text-base font-bold text-gray-900 hover:text-emerald-600 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{task.title}</span>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-500">Task no longer available</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        Applied on {new Date(a.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      {task && (
                        <span className="text-base font-bold font-mono tabular-nums text-emerald-600 block">
                          {inr(task.reward_amount)}
                        </span>
                      )}
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold mt-0.5 ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-3.5">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Your Application Pitch:
                    </p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {a.message}
                    </p>
                  </div>

                  {a.status === "pending" && (
                    <div className="pt-2 flex justify-end">
                      <form action={withdrawApplication}>
                        <input type="hidden" name="applicationId" value={a.id} />
                        <button className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline">
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
