import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/submissions/final-files
 * Body: { submissionId: string }
 *
 * Returns short-lived (60 min) signed download URLs for final deliverables.
 * Access is granted ONLY if:
 *   1. Caller is authenticated
 *   2. Caller is the project owner (client) of the task this submission belongs to
 *   3. final_unlocked = true on the submission (set only after confirmed payment release)
 *
 * The service-role key is used server-side to generate signed URLs.
 * It is never exposed to the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = String(body.submissionId ?? "").trim();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    // 1. Verify the calling user is authenticated (anon client reads session cookie)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Use the check_final_access RPC to validate access + retrieve paths
    //    This runs as the authenticated user so RLS is respected.
    const { data: accessData, error: accessError } = await supabase.rpc(
      "check_final_access",
      { p_submission_id: submissionId }
    );

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 403 });
    }

    const paths: string[] = accessData?.paths ?? [];

    if (paths.length === 0) {
      return NextResponse.json({ urls: [] });
    }

    // 3. Generate signed URLs for deliverables (private bucket)
    const service = createServiceClient();
    const signedUrls: { path: string; url: string; name: string }[] = [];

    for (const path of paths) {
      let signData: { signedUrl: string } | null = null;

      // Try service client first
      try {
        const { data, error } = await service.storage
          .from("deliverables")
          .createSignedUrl(path, 3600);
        if (!error && data?.signedUrl) {
          signData = data;
        }
      } catch (e) {
        // Fallback below
      }

      // If service role key is not configured, fallback to authenticated user client
      if (!signData) {
        try {
          const { data, error } = await supabase.storage
            .from("deliverables")
            .createSignedUrl(path, 3600);
          if (!error && data?.signedUrl) {
            signData = data;
          } else if (error) {
            console.error("Failed to sign URL with user client:", path, error);
          }
        } catch (e) {
          console.error("Sign URL exception:", e);
        }
      }

      if (!signData?.signedUrl) {
        console.error("Could not generate signed URL for path:", path);
        continue;
      }

      // Extract a human-readable filename from the storage path
      const name = path.split("/").pop() ?? path;

      signedUrls.push({ path, url: signData.signedUrl, name });
    }

    return NextResponse.json({ urls: signedUrls });
  } catch (err: any) {
    console.error("final-files API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
