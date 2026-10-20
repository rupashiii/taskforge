"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSkills(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 15);

  await supabase.from("profiles").update({ skills }).eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/marketplace");
  redirect("/dashboard");
}
