import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "../actions";
import { ArrowLeft, Sparkles, AlertCircle, Plus, IndianRupee } from "lucide-react";

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
  if (profile?.role !== "client") redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to dashboard</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Create a New Project
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Describe the overall project goals. In the next step, you can break it down into micro-tasks and assign rewards.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form
          action={createProject}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Project Title
            </label>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="e.g. Modern Landing Page Redesign with Next.js"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Requirements &amp; Scope
            </label>
            <textarea
              name="description"
              required
              rows={8}
              placeholder="Describe the deliverables in detail. What tech stack should be used? What platforms or screen sizes? What are the key features and quality expectations?"
              className="w-full rounded-xl border border-gray-200 p-4 text-xs leading-relaxed outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              At least 30 characters required. The more context you provide, the easier it is for freelancers to deliver accurately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Target Budget (₹) <span className="text-gray-400 font-normal">— Optional Cap</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                ₹
              </span>
              <input
                name="budget"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 50000 (leave blank for no budget cap)"
                className="w-full rounded-xl border border-gray-200 pl-8 pr-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              The total reward of all tasks combined cannot exceed this amount when publishing.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project Draft</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
