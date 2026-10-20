"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addFunds(formData: FormData) {
  const amount = Number(String(formData.get("amount") ?? "").trim());

  if (Number.isNaN(amount) || amount <= 0) {
    redirect(`/wallet?error=${encodeURIComponent("Enter an amount greater than 0.")}`);
  }
  if (amount > 500000) {
    redirect(
      `/wallet?error=${encodeURIComponent("Demo limit: you can add at most ₹5,00,000 at a time.")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("add_funds", { p_amount: amount });

  if (error) redirect(`/wallet?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/wallet");
  redirect("/wallet?added=1");
}
