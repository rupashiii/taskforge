"use client";

import { useState } from "react";
import { Download, Lock, Loader2, AlertCircle, CheckCircle2, FileDown } from "lucide-react";

interface FinalFilesProps {
  submissionId: string;
  unlocked: boolean;
}

interface SignedFile {
  path: string;
  url: string;
  name: string;
}

export default function FinalFilesPanel({ submissionId, unlocked }: FinalFilesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<SignedFile[] | null>(null);

  async function loadFinalFiles() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions/final-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load final files.");
        setLoading(false);
        return;
      }

      setFiles(data.urls ?? []);
    } catch (err: any) {
      setError(err.message ?? "Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
            Final Deliverables — Securely Locked
          </span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          The original deliverables are securely locked. They will become
          available after you <strong>accept the submission</strong> and the
          payment release is successfully confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <span className="text-sm font-bold text-teal-800 dark:text-teal-300">
          Final Deliverables — Unlocked
        </span>
      </div>
      <p className="text-xs text-teal-700 dark:text-teal-400">
        Payment has been released. Download your final deliverables below.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {files === null ? (
        <button
          onClick={loadFinalFiles}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {loading ? "Loading files…" : "Load Final Deliverables"}
        </button>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No final files were uploaded with this submission.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.path}>
              <a
                href={f.url}
                download={f.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-teal-300 dark:border-teal-700 bg-card px-3 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5 shrink-0" />
                <span className="break-all">{f.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
