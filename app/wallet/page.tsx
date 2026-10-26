import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addFunds } from "./actions";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Clock,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

const inr = (n: number) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const TXN_CONFIG: Record<
  string,
  { label: string; sign: "+" | "-" | ""; color: string; icon: any }
> = {
  deposit: {
    label: "Funds Deposited",
    sign: "+",
    color: "text-blue-600 dark:text-blue-400",
    icon: ArrowDownLeft,
  },
  escrow_hold: {
    label: "Held in Escrow",
    sign: "-",
    color: "text-amber-600 dark:text-amber-400",
    icon: Lock,
  },
  release: {
    label: "Released from Escrow",
    sign: "",
    color: "text-slate-600 dark:text-slate-400",
    icon: ArrowUpRight,
  },
  refund: {
    label: "Refunded to Wallet",
    sign: "+",
    color: "text-teal-600 dark:text-teal-400",
    icon: ArrowDownLeft,
  },
  payout: {
    label: "Milestone Payout Received",
    sign: "+",
    color: "text-teal-600 dark:text-teal-400",
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell userId={user.id} />
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Escrow &amp; Account Wallet
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {isClient
                ? "Funds are securely locked in escrow per task and paid out upon milestone approval."
                : "Deliverable payouts are credited directly to your balance upon client sign-off."}
            </p>
          </div>
          <span className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            Simulated Sandbox Mode
          </span>
        </div>

        {/* Feedback */}
        {sp.error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs font-medium text-red-700 dark:text-red-400">
            {sp.error}
          </div>
        )}
        {sp.added && (
          <div className="rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/40 p-3.5 text-xs font-medium text-teal-700 dark:text-teal-400">
            ✓ Funds successfully credited to your wallet balance.
          </div>
        )}

        {/* Balances Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          {isClient ? (
            <>
              <div className="rounded-xl border border-border bg-card p-5.5 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Available Wallet Balance
                </span>
                <p className="text-3xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
                  {inr(summary.available ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Ready to lock into escrow for new project tasks
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5.5 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Locked in Active Escrow
                </span>
                <p className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {inr(summary.escrow ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Committed to active tasks and released on your sign-off
                </p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 rounded-xl border border-border bg-card p-6 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Milestone Earnings
              </span>
              <p className="text-3xl font-extrabold font-mono text-teal-600 dark:text-teal-400">
                {inr(summary.earned ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Verified rewards released automatically upon client deliverable approvals.
              </p>
            </div>
          )}
        </div>

        {/* Add funds */}
        {isClient && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Add Funds to Wallet</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top up your client account balance to fund upcoming project deliverables (up to ₹5,00,000 at a time).
              </p>
            </div>

            <form action={addFunds} className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">₹</span>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  max="500000"
                  step="1"
                  required
                  placeholder="e.g. 50000"
                  className="w-full rounded-md border border-input bg-background pl-8 pr-3.5 py-2.5 text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add to Balance
              </button>
            </form>
          </div>
        )}

        {/* Transactions */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="border-b border-border px-5 py-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Ledger Transactions
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {txnList.length} total entries
            </span>
          </div>

          {txnList.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No transactions recorded yet in this workspace.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {txnList.map((t) => {
                const cfg = TXN_CONFIG[t.type] ?? {
                  label: t.type,
                  sign: "",
                  color: "text-foreground",
                  icon: Clock,
                };
                const taskTitle = t.task_id ? titleById.get(t.task_id) : null;
                const IconComponent = cfg.icon;

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{cfg.label}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {new Date(t.created_at).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {taskTitle && (
                            <span className="ml-1 text-foreground font-sans">
                              · {taskTitle}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <p className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${cfg.color}`}>
                      {cfg.sign}
                      {inr(t.amount)}
                    </p>
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
