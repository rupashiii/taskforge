import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskFields from "../../../task-fields";
import { updateTask } from "../../../task-actions";
import { ArrowLeft, Save, X, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function EditTaskPage({
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
    .select("id, title, status")
    .eq("id", id)
    .single();

  if (!project) notFound();
  if (project.status !== "draft") redirect(`/projects/${id}`);

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, title, description, skills_required, acceptance_criteria, complexity, estimated_hours, reward_amount, deadline"
    )
    .eq("id", taskId)
    .eq("project_id", id)
    .single();

  if (!task) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-6">
      <div className="mx-auto max-w-3xl space-y-6">
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

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Edit Milestone Task
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Modify task requirements, rewards, or acceptance criteria before publishing to escrow.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form
          action={updateTask}
          className="rounded-xl border border-border bg-card p-6 sm:p-7 shadow-xs space-y-6"
        >
          <input type="hidden" name="projectId" value={id} />
          <input type="hidden" name="taskId" value={taskId} />

          <TaskFields
            defaults={{
              title: task.title,
              description: task.description,
              skills: (task.skills_required ?? []).join(", "),
              criteria: (task.acceptance_criteria ?? []).join("\n"),
              complexity: task.complexity ?? 3,
              hours: task.estimated_hours,
              reward: task.reward_amount,
              deadline: task.deadline ? String(task.deadline).slice(0, 10) : "",
            }}
          />

          <div className="pt-2 flex items-center gap-3 border-t border-border">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
            <Link
              href={`/projects/${id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Cancel</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
