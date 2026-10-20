import Link from "next/link";
import { Sparkles, Shield, Target, ArrowRight, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="w-full flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">TaskForge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all shadow-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-20 bg-gradient-to-b from-gray-50 via-white to-white">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-xs font-medium text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Project Management
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              TaskForge
            </span>
          </h1>

          <p className="max-w-xl text-lg text-gray-600 leading-relaxed">
            Describe your project. AI breaks it into tasks, estimates effort, and
            sets a fair reward. Freelancers pick up the work.
          </p>

          <div className="flex gap-4 pt-2">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto w-full pt-8">
          <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">AI Task Breakdown</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Describe your project and AI splits it into clear, actionable tasks.
            </p>
          </div>

          <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Escrow Payments</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Funds are held securely and released only when work is approved.
            </p>
          </div>

          <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Skill Matching</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Tasks are matched to freelancers with the right skills automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Built with Next.js & Supabase
        </p>
      </footer>
    </main>
  );
}
