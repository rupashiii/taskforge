import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addFunds } from "./actions";
import {
  Wallet as WalletIcon,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Plus,
  AlertCircle,
  CheckCircle,
  IndianRupee,
  Clock,
} from "lucide-react";

const inr = (n: number) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const TXN_CONFIG: Record<
  string,
  { label: string; sign: "+" | "-" | ""; className: string; icon: any }
> = {
  deposit: {
    label: "Funds Added",
    sign: "+",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: ArrowDownLeft,
  },
  escrow_hold: {
    label: "Held in Escrow",
    sign: "-",
    className: "text-amber-600 bg-amber-50 border-amber-200",
    icon: ShieldCheck,
  },
  release: {
    label: "Released from Escrow",
    sign: "",
    className: "text-gray-600 bg-gray-50 border-gray-200",
    icon: ArrowUpRight,
  },
  refund: {
    label: "Refunded to Wallet",
    sign: "+",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: ArrowDownLeft,
  },
  payout: {
    label: "Payment Received",
    sign: "+",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: ArrowDownLeft,
  },
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isClient = profile?.role === "client";

  const { data: summaryRaw } = await supabase.rpc("wallet_summary");
  const summary = (summaryRaw ?? {}) as {
    available?: number;
    escrow?: number;
    earned?: number;
  };

  const { data: txns } = await supabase
    .from("wallet_transactions")
    .select("id, type, amount, task_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const txnList = (txns ?? []) as any[];
  const taskIds = Array.from(
    new Set(txnList.map((t) => t.task_id).filter(Boolean))
  ) as string[];

  const { data: tasks } = taskIds.length
    ? await supabase.from("tasks").select("id, title").in("id", taskIds)
    : { data: [] };

  const titleById = new Map<string, string>(
    (tasks ?? []).map((t: any) => [t.id, t.title])
  );

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to dashboard</span>
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <WalletIcon className="h-6 w-6 text-emerald-600" />
              <span>Simulated Escrow Wallet</span>
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {isClient
                ? "Funds are securely held in escrow when publishing and released upon approving deliverables."
                : "Your earnings from completed tasks are credited directly to this balance."}
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            Phase 1 · Simulated Demo
          </span>
        </div>

        {/* Feedback Alerts */}
        {sp.error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{sp.error}</span>
          </div>
        )}
        {sp.added && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 shadow-sm">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Funds successfully added to your wallet.</span>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {isClient ? (
            <>
              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Available Balance
                </span>
                <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-600">
                  {inr(summary.available ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Ready to lock for new tasks or projects
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Locked in Escrow
                </span>
                <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-amber-600">
                  {inr(summary.escrow ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Committed to active or open tasks
                </p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Earned to Date
              </span>
              <p className="mt-2 text-4xl font-bold font-mono tabular-nums text-emerald-600">
                {inr(summary.earned ?? 0)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Paid out automatically upon client approval
              </p>
            </div>
          )}
        </div>

        {/* Add Funds Form (Clients only) */}
        {isClient && (
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Add Demo Funds</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Top up your wallet to publish projects and fund escrow (up to ₹5,00,000 at a time).
              </p>
            </div>

            <form action={addFunds} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  ₹
                </span>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  max="500000"
                  step="1"
                  required
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl border border-gray-200 pl-8 pr-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Funds</span>
              </button>
            </form>
          </div>
        )}

        {/* Transactions Ledger */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Ledger History</h2>
              <p className="text-xs text-gray-500">Every rupee is traceable through an immutable ledger.</p>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {txnList.length} transactions
            </span>
          </div>

          {txnList.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {txnList.map((t) => {
                const cfg = TXN_CONFIG[t.type] ?? {
                  label: t.type,
                  sign: "",
                  className: "text-gray-700 bg-gray-50 border-gray-200",
                  icon: Clock,
                };
                const taskTitle = t.task_id ? titleById.get(t.task_id) : null;
                const IconComponent = cfg.icon;

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-xs">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(t.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {taskTitle && (
                            <span className="ml-1 text-gray-500">
                              · Task: <span className="font-medium text-gray-700">{taskTitle}</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono tabular-nums ${cfg.className.split(" ")[0]}`}>
                        {cfg.sign}
                        {inr(t.amount)}
                      </p>
                      <span className="text-[10px] uppercase font-semibold text-gray-400">
                        {t.type.replace("_", " ")}
                      </span>
                    </div>
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
