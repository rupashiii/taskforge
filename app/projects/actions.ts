"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/projects/new?error=${encodeURIComponent(message)}`);
}

export async function createProject(formData: FormData) {
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

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw === "" ? 0 : Number(budgetRaw);

  if (title.length < 3) fail("Title must be at least 3 characters.");
  if (title.length > 120) fail("Title is too long (max 120 characters).");
  if (description.length < 30)
    fail("Please describe your project in at least 30 characters.");
  if (Number.isNaN(budget) || budget < 0) fail("Budget must be a positive number.");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: user.id,
      title,
      description,
      total_budget: budget,
    })
    .select("id")
    .single();

  if (error || !data) fail(error?.message ?? "Could not create project.");

  redirect(`/projects/${data.id}`);
}
