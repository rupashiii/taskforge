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
  const previewLinksRaw = String(formData.get("preview_links") ?? "");
  const previewNotes = String(formData.get("preview_notes") ?? "").trim();
  const demoUrl = String(formData.get("demo_url") ?? "").trim();
  const finalPathsRaw = String(formData.get("final_paths") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Parse preview links (one per line)
  const previewLinks = previewLinksRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (previewLinks.length === 0)
    fail("Add at least one preview link (screenshot, demo URL, or repo link).");
  if (previewLinks.length > 10) fail("You can add at most 10 preview links.");

  for (const link of previewLinks) {
    let ok = false;
    try {
      const u = new URL(link);
      ok = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) fail(`"${link}" is not a valid http(s) link.`);
  }

  // Validate optional demo URL
  if (demoUrl) {
    let ok = false;
    try {
      const u = new URL(demoUrl);
      ok = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) fail(`"${demoUrl}" is not a valid demo URL.`);
  }

  if (previewNotes.length > 2000) fail("Preview notes are too long (max 2000 characters).");

  // Parse final file paths (JSON array stored in hidden input)
  let finalPaths: string[] = [];
  if (finalPathsRaw) {
    try {
      const parsed = JSON.parse(finalPathsRaw);
      if (Array.isArray(parsed)) {
        finalPaths = parsed.filter((p) => typeof p === "string" && p.length > 0);
      }
    } catch {
      // Invalid JSON
    }
  }

  if (finalPaths.length === 0) {
    fail("Upload at least one deliverable file in the Final Deliverable Package before submitting.");
  }

  const { error } = await supabase.rpc("submit_work", {
    p_task_id: taskId,
    p_links: previewLinks,
    p_notes: previewNotes || null,
    p_demo_url: demoUrl || null,
    p_final_paths: finalPaths,
  });

  if (error) fail(error.message);

  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  redirect("/my-tasks");
}
