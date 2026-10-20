"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ParsedTask = {
  title: string;
  description: string;
  skills_required: string[];
  acceptance_criteria: string[];
  complexity: number;
  estimated_hours: number | null;
  reward_amount: number;
  deadline: string | null;
};

function fail(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

// Makes sure the user owns the project and that it is still a draft.
async function requireDraftProject(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, status, total_budget")
    .eq("id", projectId)
    .eq("client_id", user.id)
    .single();

  if (!project) redirect("/dashboard");

  if (project.status !== "draft") {
    fail(`/projects/${projectId}`, "A published project can no longer be edited.");
  }

  return { supabase, project };
}

function splitList(raw: string, separator: RegExp, max: number): string[] {
  return raw
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function parseTask(
  formData: FormData
): { error: string } | { values: ParsedTask } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const skillsRaw = String(formData.get("skills") ?? "");
  const criteriaRaw = String(formData.get("criteria") ?? "");
  const complexityRaw = String(formData.get("complexity") ?? "3");
  const hoursRaw = String(formData.get("hours") ?? "").trim();
  const rewardRaw = String(formData.get("reward") ?? "").trim();
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();

  if (title.length < 3) return { error: "Task title must be at least 3 characters." };
  if (title.length > 120) return { error: "Task title is too long (max 120 characters)." };
  if (description.length < 10)
    return { error: "Task description must be at least 10 characters." };

  const complexity = Number(complexityRaw);
  if (!Number.isInteger(complexity) || complexity < 1 || complexity > 5)
    return { error: "Complexity must be between 1 and 5." };

  let estimated_hours: number | null = null;
  if (hoursRaw !== "") {
    estimated_hours = Number(hoursRaw);
    if (Number.isNaN(estimated_hours) || estimated_hours <= 0 || estimated_hours > 500)
      return { error: "Estimated hours must be a number between 0 and 500." };
  }

  const reward_amount = Number(rewardRaw);
  if (rewardRaw === "" || Number.isNaN(reward_amount) || reward_amount <= 0)
    return { error: "Reward must be a number greater than 0." };

  let deadline: string | null = null;
  if (deadlineRaw !== "") {
    if (Number.isNaN(Date.parse(deadlineRaw)))
      return { error: "Deadline is not a valid date." };
    deadline = deadlineRaw;
  }

  return {
    values: {
      title,
      description,
      skills_required: splitList(skillsRaw, /,/, 10).map((s) => s.toLowerCase()),
      acceptance_criteria: splitList(criteriaRaw, /\r?\n/, 15),
      complexity,
      estimated_hours,
      reward_amount,
      deadline,
    },
  };
}

export async function addTask(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const { supabase } = await requireDraftProject(projectId);

  const parsed = parseTask(formData);
  if ("error" in parsed) fail(`/projects/${projectId}`, parsed.error);

  const { error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, status: "draft", ...parsed.values });

  if (error) fail(`/projects/${projectId}`, error.message);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function updateTask(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const editPath = `/projects/${projectId}/tasks/${taskId}/edit`;

  const { supabase } = await requireDraftProject(projectId);

  const parsed = parseTask(formData);
  if ("error" in parsed) fail(editPath, parsed.error);

  const { error } = await supabase
    .from("tasks")
    .update(parsed.values)
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) fail(editPath, error.message);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function deleteTask(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");

  const { supabase } = await requireDraftProject(projectId);

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) fail(`/projects/${projectId}`, error.message);

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function publishProject(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const { supabase } = await requireDraftProject(projectId);

  // One database transaction: checks budget and wallet balance,
  // holds every reward in escrow, opens the tasks, publishes the project.
  const { error } = await supabase.rpc("publish_project", {
    p_project_id: projectId,
  });

  if (error) fail(`/projects/${projectId}`, error.message);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  redirect(`/projects/${projectId}`);
}
