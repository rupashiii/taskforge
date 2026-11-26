"use client";

import { useState, useRef } from "react";
import { submitWork } from "@/app/my-tasks/actions";
import {
  Send,
  Upload,
  Lock,
  Link2,
  FileText,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

interface DualSubmitFormProps {
  taskId: string;
  isRevision?: boolean;
}

export default function DualSubmitForm({ taskId, isRevision }: DualSubmitFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadError(null);
    setUploading(true);

    const newPaths: UploadedFile[] = [];

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the 50 MB file size limit.`);
        setUploading(false);
        return;
      }

      try {
        // 1. Get a signed upload URL from our server
        const urlRes = await fetch("/api/submissions/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            taskId,
          }),
        });

        const urlData = await urlRes.json();

        if (!urlRes.ok) {
          setUploadError(urlData.error ?? "Failed to get upload URL.");
          setUploading(false);
          return;
        }

        // 2. Upload directly to Supabase Storage using the signed URL
        const uploadRes = await fetch(urlData.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadRes.ok) {
          setUploadError(`Failed to upload "${file.name}". Please try again.`);
          setUploading(false);
          return;
        }

        newPaths.push({ name: file.name, path: urlData.path, size: file.size });
      } catch (err: any) {
        setUploadError(err.message ?? "Upload failed.");
        setUploading(false);
        return;
      }
    }

    setUploadedFiles((prev) => [...prev, ...newPaths]);
    setUploading(false);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(path: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.path !== path));
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    // Inject final file paths as JSON into the hidden field
    formData.set("final_paths", JSON.stringify(uploadedFiles.map((f) => f.path)));
    await submitWork(formData);
    // If we get here, submitWork redirected; setSubmitting cleanup is a safety net
    setSubmitting(false);
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-5 space-y-5 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10 p-5"
    >
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="final_paths" value={JSON.stringify(uploadedFiles.map((f) => f.path))} />

      <div>
        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
          <Send className="h-4 w-4 text-primary" />
          {isRevision ? "Submit Updated Work" : "Submit Your Work"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload both a preview package and your final deliverables. The client
          can only access the preview until they accept and payment is released.
        </p>
      </div>

      {/* ── SECTION A: Preview Package ─────────────────────── */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            A — Preview Package
          </h4>
        </div>
        <p className="text-[11px] text-blue-700 dark:text-blue-400">
          Provide evidence of completed work. Add links to screenshots, demo
          videos, staging URLs, or a live demo so the client can verify quality.
        </p>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Demo URL{" "}
            <span className="font-normal lowercase text-muted-foreground">— optional</span>
          </label>
          <input
            type="url"
            name="demo_url"
            placeholder="https://your-demo.vercel.app"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview Links{" "}
            <span className="font-normal lowercase text-muted-foreground">
              — one per line, required
            </span>
          </label>
          <textarea
            name="preview_links"
            required
            rows={3}
            placeholder={
              "https://github.com/org/repo\nhttps://www.loom.com/share/...\nhttps://drive.google.com/..."
            }
            className="w-full rounded-md border border-input bg-background p-3 text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Use GitHub, Figma, Loom, Google Drive, Vercel preview, or any
            publicly accessible link. For software, include a working demo.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview Notes{" "}
            <span className="font-normal lowercase text-muted-foreground">— optional</span>
          </label>
          <textarea
            name="preview_notes"
            rows={3}
            maxLength={2000}
            placeholder="Explain what has been completed, any test credentials, instructions, or how to evaluate the preview..."
            className="w-full rounded-md border border-input bg-background p-3 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* ── SECTION B: Final Deliverable Package ───────────── */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            B — Final Deliverable Package{" "}
            <span className="font-normal lowercase tracking-normal">(securely locked until accepted)</span>
          </h4>
        </div>
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Upload your actual deliverables here — source code, ZIP, design files,
          documents, etc. The client <strong>cannot access these files</strong>{" "}
          until they accept the submission and the payment is successfully
          released from escrow.
        </p>

        {uploadError && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-2.5 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <ul className="space-y-1.5">
            {uploadedFiles.map((f) => (
              <li
                key={f.path}
                className="flex items-center justify-between gap-2 rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-all">{f.name}</span>
                  <span className="text-muted-foreground font-normal">({formatBytes(f.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(f.path)}
                  className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                  title="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            id="final-file-input"
            className="sr-only"
            onChange={handleFileChange}
            accept=".zip,.tar,.gz,.7z,.rar,.pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.txt,.md,.json,.docx,.xlsx,.pptx,.doc,.xls"
          />
          <label
            htmlFor="final-file-input"
            className={`inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-amber-400 dark:border-amber-700 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload Final Files"}
          </label>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            ZIP, PDF, source code, design files, documents. Max 50 MB per file.
            These are securely stored and invisible to the client until acceptance.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || uploading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {submitting ? "Submitting…" : "Submit both packages for review"}
      </button>
    </form>
  );
}
