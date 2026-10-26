import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronRight,
  UserCheck
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Task<span className="text-blue-600 dark:text-blue-400">Forge</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-md px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/40 px-3.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300">
            <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>AI Task Decomposition &amp; Milestone Escrow</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Turn broad project ideas into{" "}
            <span className="text-blue-600 dark:text-blue-400">verified delivered tasks.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            TaskForge uses AI to break large scopes into structured micro-milestones with acceptance criteria,
            matching them to verified talent while keeping your budget locked in safe escrow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Start as Client or Freelancer
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Explore Public Marketplace
            </Link>
          </div>
        </div>

        {/* Product Preview Mockup */}
        <div className="mx-auto max-w-5xl mt-14 sm:mt-18">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm overflow-hidden">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-border bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  taskforge.app/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-900/50">
                <Lock className="h-3 w-3" />
                Escrow Protected: ₹45,000
              </div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Active Project
                    </span>
                    <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 text-[11px] font-semibold">
                      In Progress
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    NextGen Payment Gateway &amp; Billing Portal
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="rounded-md bg-slate-100 dark:bg-slate-800 px-3 py-2 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500 block">Milestones</span>
                    <strong className="text-slate-900 dark:text-white font-mono">3 of 4 Complete</strong>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-slate-50/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Database Schema &amp; Supabase Storage for Resumes
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">Assigned to: Rohan M.</span>
                        <span className="rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                          PostgreSQL
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">₹12,000</span>
                    <span className="block text-[11px] text-teal-600 dark:text-teal-400 font-medium">Approved &amp; Paid</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Razorpay Order Creation &amp; Signature Verification
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">Assigned to: Priya K.</span>
                        <span className="rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                          Next.js API
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">₹18,000</span>
                    <span className="block text-[11px] text-blue-600 dark:text-blue-400 font-medium">Review Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="border-t border-border bg-slate-50/50 dark:bg-slate-900/20 px-6 py-20">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Architecture &amp; Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Engineered for predictable software delivery.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
              No endless hourly billing disputes. Clear contracts, granular tasks, and deterministic escrow payouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="h-10 w-10 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                AI Task Breakdown
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Provide your feature spec. The engine automatically outputs modular milestones with verifiable acceptance criteria.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="h-10 w-10 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Deterministic Escrow
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Client funds are held in escrow on task assignment. Payouts execute automatically when criteria are satisfied.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
              <div className="h-10 w-10 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Talent Match &amp; Resumes
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Review pitches, verified ratings, and direct PDF resumes before selecting and locking in a freelancer for any task.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-background py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              TF
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">TaskForge</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              — Production Project &amp; Escrow Platform
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/login" className="hover:text-blue-600 transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-blue-600 transition-colors">
              Create Account
            </Link>
            <Link href="/marketplace" className="hover:text-blue-600 transition-colors">
              Marketplace
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
