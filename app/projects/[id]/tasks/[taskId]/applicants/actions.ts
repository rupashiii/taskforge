"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acceptApplication(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const path = `/projects/${projectId}/tasks/${taskId}/applicants`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // One database transaction: accept this one, reject the rest, assign the task.
  const { error } = await supabase.rpc("accept_application", {
    p_application_id: applicationId,
  });

  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(path);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(path);
}
