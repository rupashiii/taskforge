"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Briefcase, Code, FileText, Layers, ArrowRight, Loader2, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    // Validate resume if provided
    if (resumeFile) {
      if (resumeFile.type !== "application/pdf") {
        setError("Resume must be a PDF file.");
        setLoading(false);
        return;
      }
      if (resumeFile.size > 5 * 1024 * 1024) {
        setError("Resume must be smaller than 5 MB.");
        setLoading(false);
        return;
      }
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    // Ensure the profile row has the correct role and name
    // (the Supabase trigger may default role to 'freelancer')
    if (userId) {
      // Small delay to let the trigger create the profile row first
      await new Promise((r) => setTimeout(r, 500));

      await supabase
        .from("profiles")
        .update({ role, full_name: fullName })
        .eq("id", userId);
    }

    // Upload resume if user is a freelancer and provided a file
    if (role === "freelancer" && resumeFile && userId) {
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(`${userId}.pdf`, resumeFile, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        // Non-fatal: account created but resume upload failed
        setError(`Account created, but resume upload had an issue: ${uploadError.message}. You can update it anytime from your dashboard.`);
        setLoading(false);
        return;
      }

      // Get the public URL and store it in the profile
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(`${userId}.pdf`);

      await supabase
        .from("profiles")
        .update({ resume_url: urlData.publicUrl })
        .eq("id", userId);
    }

    setLoading(false);

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setInfo("Account created! Check your email to confirm, then log in.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Task<span className="text-blue-600 dark:text-blue-400">Forge</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">Join TaskForge to publish tasks or pick up verified gigs</p>
        </div>

        <form
          onSubmit={handleSignup}
          className="space-y-4 rounded-xl border border-border bg-card p-6 sm:p-7 shadow-xs"
        >
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Create your account</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose your primary role to configure your workspace</p>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`relative flex flex-col p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  role === "client"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-600"
                    : "border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                }`}
              >
                {role === "client" && (
                  <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <Briefcase className={`h-4 w-4 mb-1.5 ${role === "client" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold">Client</span>
                <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  I want to break down projects &amp; hire
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole("freelancer")}
                className={`relative flex flex-col p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  role === "freelancer"
                    ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 ring-1 ring-teal-600"
                    : "border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                }`}
              >
                {role === "freelancer" && (
                  <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <Code className={`h-4 w-4 mb-1.5 ${role === "freelancer" ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold">Freelancer</span>
                <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  I want to complete tasks &amp; get paid
                </span>
              </button>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-3 pt-1">
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="e.g. Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Resume upload – only for freelancers */}
            {role === "freelancer" && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="resume" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Resume / CV
                  </label>
                  <span className="text-[11px] text-muted-foreground">PDF only, max 5 MB (optional)</span>
                </div>
                <label
                  htmlFor="resume"
                  className={`flex items-center gap-2.5 w-full rounded-md border border-dashed px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                    resumeFile
                      ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300"
                      : "border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-900 text-muted-foreground"
                  }`}
                >
                  <FileText className={`h-4 w-4 shrink-0 ${resumeFile ? "text-teal-600" : "text-muted-foreground"}`} />
                  <span className="truncate font-medium">
                    {resumeFile ? resumeFile.name : "Upload your resume PDF for client preview"}
                  </span>
                </label>
                <input
                  id="resume"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
                {resumeFile && (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                      ✓ Ready to attach on signup
                    </span>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-medium text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating account…</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
