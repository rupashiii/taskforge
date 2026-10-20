"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reviewSubmission(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const submissionId = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();
  const reopen = String(formData.get("reopen") ?? "1") !== "0";

  const reviewPath = `/projects/${projectId}/tasks/${taskId}/review`;

  if (!["approve", "revision", "reject"].includes(decision)) {
    redirect(`${reviewPath}?error=${encodeURIComponent("Choose a decision first.")}`);
  }
  if (feedback.length > 2000) {
    redirect(`${reviewPath}?error=${encodeURIComponent("Feedback is too long (max 2000 characters).")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // One database transaction (see review_submission in step7.sql)
  const { error } = await supabase.rpc("review_submission", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_feedback: feedback || null,
    p_reopen: reopen,
  });

  if (error) redirect(`${reviewPath}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(reviewPath);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${projectId}`);
}
