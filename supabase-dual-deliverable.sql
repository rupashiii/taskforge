-- ============================================================
-- TaskForge: Dual Deliverable Submission Workflow Migration
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================

-- ─── 1. Extend submissions table ────────────────────────────

-- Safely rename existing columns if they haven't been renamed yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'submissions' 
      AND column_name = 'links'
  ) THEN
    ALTER TABLE public.submissions RENAME COLUMN links TO preview_links;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'submissions' 
      AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.submissions RENAME COLUMN notes TO preview_notes;
  END IF;
END $$;

-- Add new preview and final-deliverable columns
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS preview_demo_url  TEXT,
  ADD COLUMN IF NOT EXISTS final_file_paths  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS final_unlocked    BOOLEAN DEFAULT FALSE NOT NULL;

-- Index for fast unlock checks
CREATE INDEX IF NOT EXISTS idx_submissions_final_unlocked
  ON public.submissions(id, final_unlocked);

-- ─── 2. Private storage bucket for final deliverables ────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deliverables',
  'deliverables',
  FALSE,          -- PRIVATE bucket
  52428800,       -- 50 MB per file
  NULL            -- allow any file type (source code, archives, documents, designs, etc.)
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- ─── 3. Storage RLS for deliverables bucket ─────────────────

-- Freelancers can upload to their own path: deliverables/<uid>/<anything>
DROP POLICY IF EXISTS "Freelancers can upload final deliverables" ON storage.objects;
CREATE POLICY "Freelancers can upload final deliverables"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'deliverables'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE (auth.uid()::text || '/%')
    )
  );

-- Freelancers can read their own uploaded files
DROP POLICY IF EXISTS "Freelancers can read own deliverables" ON storage.objects;
CREATE POLICY "Freelancers can read own deliverables"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE (auth.uid()::text || '/%')
    )
  );

-- Clients can read final deliverables ONLY after payment release (final_unlocked = true)
DROP POLICY IF EXISTS "Clients can read unlocked deliverables" ON storage.objects;
CREATE POLICY "Clients can read unlocked deliverables"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deliverables'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.tasks t ON t.id = s.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.client_id = auth.uid()
        AND s.final_unlocked = TRUE
        AND storage.objects.name = ANY(s.final_file_paths)
    )
  );

-- ─── 4. Update submit_work RPC to accept preview + final fields ─

-- Drop old overloads so function signature is unambiguous
DROP FUNCTION IF EXISTS public.submit_work(UUID, TEXT[], TEXT);
DROP FUNCTION IF EXISTS public.submit_work(UUID, TEXT[], TEXT, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION public.submit_work(
  p_task_id          UUID,
  p_links            TEXT[],      -- preview links (screenshots, demo URLs, etc.)
  p_notes            TEXT,        -- preview notes (renamed from notes)
  p_demo_url         TEXT DEFAULT NULL,   -- optional live demo URL
  p_final_paths      TEXT[] DEFAULT '{}'  -- storage paths of final files
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task           RECORD;
  v_freelancer_id  UUID := auth.uid();
  v_next_version   INT;
  v_sub_id         UUID;
BEGIN
  -- 1. Lock and fetch task
  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- 2. Validate caller is the assigned freelancer
  IF v_task.assigned_to != v_freelancer_id THEN
    RAISE EXCEPTION 'You are not the assigned freelancer for this task';
  END IF;

  -- 3. Validate task is in a submittable state
  IF v_task.status NOT IN ('in_progress', 'revision_requested') THEN
    RAISE EXCEPTION 'Task must be in_progress or revision_requested to submit work';
  END IF;

  -- 4. At least one preview link is required
  IF array_length(p_links, 1) IS NULL OR array_length(p_links, 1) = 0 THEN
    RAISE EXCEPTION 'At least one preview link is required';
  END IF;

  -- 5. At least one final deliverable file is required
  IF array_length(p_final_paths, 1) IS NULL OR array_length(p_final_paths, 1) = 0 THEN
    RAISE EXCEPTION 'At least one final deliverable file is required';
  END IF;

  -- 6. Compute next version number
  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM public.submissions
  WHERE task_id = p_task_id;

  -- 6. Insert submission record with both packages
  INSERT INTO public.submissions (
    task_id,
    freelancer_id,
    version,
    preview_links,
    preview_notes,
    preview_demo_url,
    final_file_paths,
    final_unlocked
  ) VALUES (
    p_task_id,
    v_freelancer_id,
    v_next_version,
    p_links,
    p_notes,
    p_demo_url,
    p_final_paths,
    FALSE   -- always locked until payment confirmed
  )
  RETURNING id INTO v_sub_id;

  -- 7. Advance task status to 'submitted'
  UPDATE public.tasks
  SET status = 'submitted'
  WHERE id = p_task_id;

  RETURN json_build_object(
    'success', true,
    'submission_id', v_sub_id,
    'version', v_next_version
  );
END;
$$;

-- ─── 5. Update review_submission RPC ────────────────────────
-- Drops all older overloaded versions (including enum-typed versions)
-- to resolve PostgreSQL function overloading ambiguity.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure AS func_signature
    FROM pg_proc
    WHERE proname = 'review_submission'
      AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.review_submission(UUID, public.review_decision, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.review_submission(UUID, public.review_decision, TEXT);
DROP FUNCTION IF EXISTS public.review_submission(UUID, public.review_decision);
DROP FUNCTION IF EXISTS public.review_submission(UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.review_submission(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.review_submission(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.review_submission(
  p_submission_id  UUID,
  p_decision       TEXT,     -- 'approve' | 'revision' | 'reject' | 'decline'
  p_feedback       TEXT DEFAULT NULL,
  p_reopen         BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub         RECORD;
  v_task        RECORD;
  v_project     RECORD;
  v_caller_id   UUID := auth.uid();
  v_normalized  TEXT;
BEGIN
  -- Normalise 'decline' → 'reject' so existing history/reviews stay consistent
  v_normalized := CASE
    WHEN p_decision = 'decline' THEN 'reject'
    ELSE p_decision
  END;

  IF v_normalized NOT IN ('approve', 'revision', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  -- 1. Lock submission
  SELECT * INTO v_sub
  FROM public.submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- 2. Fetch task
  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = v_sub.task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- 3. Fetch project and verify ownership
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_task.project_id;

  IF v_project.client_id != v_caller_id THEN
    RAISE EXCEPTION 'You do not own this project';
  END IF;

  -- 4. Task must be in submitted state
  IF v_task.status != 'submitted' THEN
    RAISE EXCEPTION 'Task is not currently awaiting review (status: %)', v_task.status;
  END IF;

  -- 5. Idempotency: check if this submission was already reviewed
  IF EXISTS (
    SELECT 1 FROM public.reviews WHERE submission_id = p_submission_id
  ) THEN
    RAISE EXCEPTION 'This submission has already been reviewed';
  END IF;

  -- 6. Record the review decision
  INSERT INTO public.reviews (submission_id, decision, feedback, created_at)
  VALUES (p_submission_id, v_normalized::public.review_decision, p_feedback, NOW());

  -- ── APPROVE branch ──────────────────────────────────────────
  IF v_normalized = 'approve' THEN

    -- Idempotency: check no release transaction already exists for this task
    IF EXISTS (
      SELECT 1 FROM public.wallet_transactions
      WHERE task_id = v_task.id AND type = 'release'
    ) THEN
      RAISE EXCEPTION 'Payment has already been released for this task';
    END IF;

    -- Release escrow: add release (debit escrow) + payout (credit freelancer)
    INSERT INTO public.wallet_transactions (user_id, type, amount, task_id)
    VALUES (v_project.client_id, 'release', v_task.reward_amount, v_task.id);

    INSERT INTO public.wallet_transactions (user_id, type, amount, task_id)
    VALUES (COALESCE(v_task.assigned_to, v_sub.freelancer_id), 'payout', v_task.reward_amount, v_task.id);

    -- Unlock final deliverables ONLY after payment records are committed
    UPDATE public.submissions
    SET final_unlocked = TRUE
    WHERE id = p_submission_id;

    -- Mark task as completed
    UPDATE public.tasks
    SET status = 'completed'
    WHERE id = v_task.id;

    -- Check if entire project is now complete
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE project_id = v_task.project_id
        AND status NOT IN ('completed', 'cancelled')
    ) THEN
      UPDATE public.projects
      SET status = 'completed'
      WHERE id = v_task.project_id;
    END IF;

    RETURN json_build_object('success', true, 'action', 'approved', 'unlocked', true);

  -- ── REVISION branch ─────────────────────────────────────────
  ELSIF v_normalized = 'revision' THEN

    -- Enforce revision cap
    IF v_task.revision_count >= v_task.max_revisions THEN
      RAISE EXCEPTION 'Revision cap reached (% of %)', v_task.revision_count, v_task.max_revisions;
    END IF;

    IF p_feedback IS NULL OR trim(p_feedback) = '' THEN
      RAISE EXCEPTION 'Feedback notes are required when requesting revisions';
    END IF;

    -- Increment revision counter and change task status
    UPDATE public.tasks
    SET status = 'revision_requested',
        revision_count = COALESCE(revision_count, 0) + 1
    WHERE id = v_task.id;

    -- final_unlocked remains FALSE
    RETURN json_build_object('success', true, 'action', 'revision_requested');

  -- ── REJECT/DECLINE branch ────────────────────────────────────
  ELSIF v_normalized = 'reject' THEN

    IF p_feedback IS NULL OR trim(p_feedback) = '' THEN
      RAISE EXCEPTION 'A detailed reason is required when declining work';
    END IF;

    IF p_reopen THEN
      -- Reopen for other freelancers: unassign, set status back to open
      UPDATE public.tasks
      SET status = 'open',
          assigned_to = NULL,
          revision_count = 0
      WHERE id = v_task.id;
      -- Escrow remains locked for the next freelancer
    ELSE
      -- Cancel task and refund escrow to client
      UPDATE public.tasks
      SET status = 'cancelled',
          assigned_to = NULL
      WHERE id = v_task.id;

      -- Refund escrow if not already refunded
      IF NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions
        WHERE task_id = v_task.id AND type = 'refund'
      ) THEN
        INSERT INTO public.wallet_transactions (user_id, type, amount, task_id)
        VALUES (v_project.client_id, 'refund', v_task.reward_amount, v_task.id);
      END IF;
    END IF;

    -- final_unlocked stays FALSE
    RETURN json_build_object(
      'success', true,
      'action', 'rejected',
      'reopened', p_reopen
    );

  END IF;

  RETURN json_build_object('success', false);
END;
$$;

-- ─── 6. Add a helper RPC: get_signed_final_urls ──────────────
-- Called server-side only via service role; validates unlock status before
-- generating signed URLs. Never called directly from browser.

DROP FUNCTION IF EXISTS public.check_final_access(UUID);

CREATE OR REPLACE FUNCTION public.check_final_access(
  p_submission_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub       RECORD;
  v_task      RECORD;
  v_project   RECORD;
  v_caller_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_sub
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = v_sub.task_id;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_task.project_id;

  -- Only the project owner (client) may access final files
  IF v_project.client_id != v_caller_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Files are only accessible after confirmed payment release
  IF NOT v_sub.final_unlocked THEN
    RAISE EXCEPTION 'Final deliverables are not yet unlocked. Accept the submission first.';
  END IF;

  RETURN json_build_object(
    'unlocked', true,
    'paths', v_sub.final_file_paths,
    'freelancer_id', v_sub.freelancer_id
  );
END;
$$;

-- Grant execute to authenticated users (the actual access check is inside)
GRANT EXECUTE ON FUNCTION public.submit_work(UUID, TEXT[], TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_submission(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_final_access(UUID) TO authenticated;
