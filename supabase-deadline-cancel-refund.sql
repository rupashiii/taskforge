-- ========================================================
-- TaskForge: Cancel Expired Task & Refund Escrow / Extend Deadline
-- Run this in Supabase SQL Editor
-- ========================================================

-- 1. Function: Cancel an open unassigned task and refund escrow to client
CREATE OR REPLACE FUNCTION public.cancel_unassigned_task(p_task_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_project RECORD;
  v_caller_id UUID := auth.uid();
BEGIN
  -- 1. Fetch task with row lock
  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- 2. Fetch project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_task.project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- 3. Check caller owns the project
  IF v_project.client_id != v_caller_id THEN
    RAISE EXCEPTION 'You do not own this project';
  END IF;

  -- 4. Check task is open and has no assigned freelancer
  IF v_task.status != 'open' THEN
    RAISE EXCEPTION 'Only open tasks can be cancelled and refunded with this action';
  END IF;

  IF v_task.assigned_to IS NOT NULL THEN
    RAISE EXCEPTION 'Task has an assigned freelancer. Use task reclaim instead';
  END IF;

  -- 5. Mark task as cancelled
  UPDATE public.tasks
  SET status = 'cancelled'
  WHERE id = p_task_id;

  -- 6. Reject any pending applications
  UPDATE public.applications
  SET status = 'rejected'
  WHERE task_id = p_task_id AND status = 'pending';

  -- 7. Refund escrow back to client in wallet_transactions ledger
  INSERT INTO public.wallet_transactions (user_id, type, amount, task_id)
  VALUES (v_project.client_id, 'refund', v_task.reward_amount, p_task_id);

  -- 8. Check if project is completed (if all tasks completed or cancelled, and at least one completed)
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = v_task.project_id AND status = 'completed'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = v_task.project_id AND status NOT IN ('completed', 'cancelled')
  ) THEN
    UPDATE public.projects
    SET status = 'completed'
    WHERE id = v_task.project_id;
  END IF;

  RETURN json_build_object('success', true, 'refunded', v_task.reward_amount);
END;
$$;

-- 2. Function: Extend task deadline
CREATE OR REPLACE FUNCTION public.extend_task_deadline(p_task_id UUID, p_new_deadline DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_project RECORD;
  v_caller_id UUID := auth.uid();
BEGIN
  -- 1. Fetch task
  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- 2. Fetch project
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_task.project_id;

  IF v_project.client_id != v_caller_id THEN
    RAISE EXCEPTION 'You do not own this project';
  END IF;

  IF v_task.status NOT IN ('open', 'assigned', 'in_progress', 'revision_requested') THEN
    RAISE EXCEPTION 'Cannot extend deadline for completed or cancelled tasks';
  END IF;

  IF p_new_deadline < CURRENT_DATE THEN
    RAISE EXCEPTION 'New deadline must be in the future';
  END IF;

  -- 3. Update deadline
  UPDATE public.tasks
  SET deadline = p_new_deadline
  WHERE id = p_task_id;

  RETURN json_build_object('success', true, 'new_deadline', p_new_deadline);
END;
$$;
