import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "../actions";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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

  let role = profile?.role;
  if (role !== "client" && user.user_metadata?.role === "client") {
    role = "client";
    await supabase.from("profiles").update({ role: "client" }).eq("id", user.id);
  }

  if (role !== "client") redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <ThemeToggle />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create a New Project
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Provide the high-level objective and deliverables. Next, you can break it into escrowed tasks.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs font-medium text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form
          action={createProject}
          className="rounded-xl border border-border bg-card p-6 sm:p-7 space-y-4.5 shadow-xs"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Project Title
            </label>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="e.g. Next.js SaaS Authentication & Payment Integration"
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Requirements &amp; Technical Scope
            </label>
            <textarea
              name="description"
              required
              rows={6}
              placeholder="Detail the deliverables, preferred tech stack, user personas, performance constraints, and acceptance criteria..."
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              At least 30 characters. The more specific your scope, the higher quality the task breakdown.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Target Budget (₹) <span className="text-muted-foreground font-normal lowercase">— optional</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">₹</span>
              <input
                name="budget"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 50000"
                className="w-full rounded-md border border-input bg-background pl-8 pr-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Total reward sum of all decomposed tasks cannot exceed this cap when publishing.
            </p>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            Create Project Draft
          </button>
        </form>
      </div>
    </div>
  );
}
