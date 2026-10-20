"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

async function requireFreelancer() {
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

  if (profile?.role !== "freelancer") redirect("/dashboard");

  return { supabase, user };
}

export async function applyToTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const path = `/marketplace/${taskId}`;

  const { supabase, user } = await requireFreelancer();

  if (message.length < 20)
    fail(path, "Please write at least 20 characters explaining why you are a good fit.");
  if (message.length > 1000)
    fail(path, "Your message is too long (max 1000 characters).");

  // Freelancers can only read open tasks, so this also checks the task is open.
  const { data: task } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .single();

  if (!task || task.status !== "open")
    fail("/marketplace", "That task is no longer open.");

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("task_id", taskId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "withdrawn")
      fail(path, "You have already applied to this task.");

    const { error } = await supabase
      .from("applications")
      .update({ status: "pending", message })
      .eq("id", existing.id);

    if (error) fail(path, error.message);
  } else {
    const { error } = await supabase.from("applications").insert({
      task_id: taskId,
      freelancer_id: user.id,
      message,
      status: "pending",
    });

    if (error) fail(path, error.message);
  }

  revalidatePath("/marketplace");
  revalidatePath("/applications");
  redirect("/applications");
}

export async function withdrawApplication(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const { supabase, user } = await requireFreelancer();

  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId)
    .eq("freelancer_id", user.id)
    .eq("status", "pending");

  if (error) fail("/applications", error.message);

  revalidatePath("/applications");
  revalidatePath("/marketplace");
  redirect("/applications");
}
