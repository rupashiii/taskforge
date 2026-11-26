import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "application/pdf",
  "application/x-tar",
  "application/gzip",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/submissions/upload-url
 * Body: { fileName: string, fileType: string, fileSize: number, taskId: string }
 *
 * Returns a short-lived (5 min) signed upload URL for a final deliverable file.
 * The storage path is: deliverables/<userId>/<taskId>/<timestamp>-<sanitizedFileName>
 *
 * The caller must be authenticated and must be the assigned freelancer for the task.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fileName, fileType, fileSize, taskId } = body;

    if (!fileName || !fileType || !taskId) {
      return NextResponse.json(
        { error: "fileName, fileType, and taskId are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return NextResponse.json(
        { error: `File type "${fileType}" is not allowed` },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 50 MB limit" },
        { status: 400 }
      );
    }

    // Verify caller is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is the assigned freelancer for this task
    const { data: task } = await supabase
      .from("tasks")
      .select("id, assigned_to, status")
      .eq("id", taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.assigned_to !== user.id) {
      return NextResponse.json(
        { error: "You are not the assigned freelancer for this task" },
        { status: 403 }
      );
    }

    if (!["in_progress", "revision_requested"].includes(task.status)) {
      return NextResponse.json(
        { error: "Task is not in a submittable state" },
        { status: 400 }
      );
    }

    // Build a safe storage path: deliverables/<userId>/<taskId>/<timestamp>-<name>
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);
    const storagePath = `${user.id}/${taskId}/${Date.now()}-${sanitized}`;

    // Use service client to create signed upload URL (private bucket)
    const service = createServiceClient();
    const { data, error } = await service.storage
      .from("deliverables")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("Failed to create signed upload URL:", error);
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: storagePath,
      token: data.token,
    });
  } catch (err: any) {
    console.error("upload-url API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
