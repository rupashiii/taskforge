"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Upload, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";

interface UpdateResumeFormProps {
  userId: string;
  currentResumeUrl: string | null;
}

export function UpdateResumeForm({ userId, currentResumeUrl }: UpdateResumeFormProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resumeUrl, setResumeUrl] = useState(currentResumeUrl);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      setLoading(false);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be smaller than 5 MB.");
      setLoading(false);
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(`${userId}.pdf`, file, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("resumes")
      .getPublicUrl(`${userId}.pdf`);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ resume_url: urlData.publicUrl })
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setResumeUrl(urlData.publicUrl);
    setFile(null);
    setSuccess(true);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Professional Resume</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Upload your PDF resume. Clients review this before assigning you to funded tasks.
          </p>
        </div>
        {resumeUrl && (
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Active CV
          </a>
        )}
      </div>

      <form onSubmit={handleUpload} className="mt-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <label
            htmlFor="resume-upload"
            className={`flex flex-1 items-center gap-2 rounded-md border border-dashed px-3.5 py-2 text-xs cursor-pointer transition-colors ${
              file
                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300"
                : "border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-900 text-muted-foreground"
            }`}
          >
            <FileText className={`h-4 w-4 shrink-0 ${file ? "text-teal-600" : "text-muted-foreground"}`} />
            <span className="truncate font-medium">
              {file ? file.name : resumeUrl ? "Choose a new PDF to update current resume" : "Choose a PDF file (max 5 MB)"}
            </span>
          </label>
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setSuccess(false);
              setError(null);
            }}
          />
          <button
            type="submit"
            disabled={!file || loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Resume</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        )}
        {success && (
          <p className="mt-2 text-xs text-teal-700 dark:text-teal-400 font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resume updated successfully!
          </p>
        )}
      </form>
    </div>
  );
}
