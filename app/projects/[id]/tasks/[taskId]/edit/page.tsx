import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskFields from "../../../task-fields";
import { updateTask } from "../../../task-actions";
import { ArrowLeft, Save, X, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to {project.title}</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Edit Task
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Modify task requirements, rewards, or acceptance criteria before publishing.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form
          action={updateTask}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm space-y-6"
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

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
            <Link
              href={`/projects/${id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
              <span>Cancel</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
