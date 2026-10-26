"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/my-tasks?error=${encodeURIComponent(message)}`);
}

export async function startTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("start_task", { p_task_id: taskId });

  if (error) fail(error.message);

  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  redirect("/my-tasks");
}

export async function submitWork(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const linksRaw = String(formData.get("links") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const links = linksRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (links.length === 0) fail("Add at least one link to your work.");
  if (links.length > 10) fail("You can add at most 10 links.");

  for (const link of links) {
    let ok = false;
    try {
      const u = new URL(link);
      ok = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) fail(`"${link}" is not a valid http(s) link.`);
  }

  if (notes.length > 2000) fail("Notes are too long (max 2000 characters).");

  const { error } = await supabase.rpc("submit_work", {
    p_task_id: taskId,
    p_links: links,
    p_notes: notes || null,
  });

  if (error) fail(error.message);

  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  redirect("/my-tasks");
}
