-- ========================================================
-- Quick Fix: Drop Old Trigger & Update to 'assigned_to'
-- Run this in Supabase SQL Editor
-- ========================================================

-- 1. Drop the old trigger and function that had 'assignee_id'
DROP TRIGGER IF EXISTS trigger_notify_on_task_update ON public.tasks;
DROP FUNCTION IF EXISTS public.notify_on_task_update();

-- 2. Drop and re-create the correct trigger with 'assigned_to'
DROP TRIGGER IF EXISTS trigger_notify_on_task_state_change ON public.tasks;

CREATE OR REPLACE FUNCTION public.notify_on_task_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_project_id UUID := NEW.project_id;
  v_task_title TEXT := NEW.title;
  v_reward NUMERIC := NEW.reward_amount;
BEGIN
  -- Retrieve client id for the task's project
  SELECT client_id INTO v_client_id
  FROM public.projects
  WHERE id = v_project_id;

  -- Case 1: Task Assigned to a Freelancer
  IF (OLD.status != 'assigned' AND NEW.status = 'assigned' AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    VALUES (
      NEW.assigned_to,
      'Application Accepted! 🎉',
      'You have been selected for "' || v_task_title || '". You can now start the task.',
      '/my-tasks',
      'success'
    );
  END IF;

  -- Case 2: Freelancer Submits Work -> Notify Client
  IF (OLD.status != 'submitted' AND NEW.status = 'submitted') THEN
    IF v_client_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, link, type)
      VALUES (
        v_client_id,
        'Work Submitted for Review 🚀',
        'Deliverables submitted for "' || v_task_title || '". Review the submission to approve or request changes.',
        '/projects/' || v_project_id || '/tasks/' || NEW.id || '/review',
        'info'
      );
    END IF;
  END IF;

  -- Case 3: Client Requests Revision -> Notify Freelancer
  IF (OLD.status != 'revision_requested' AND NEW.status = 'revision_requested' AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    VALUES (
      NEW.assigned_to,
      'Revision Requested ⚠️',
      'The client has requested revisions on "' || v_task_title || '". Check the feedback and resubmit.',
      '/my-tasks',
      'warning'
    );
  END IF;

  -- Case 4: Client Approves Work -> Notify Freelancer (Escrow released)
  IF (OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    VALUES (
      NEW.assigned_to,
      'Work Approved! 💰',
      'Your work on "' || v_task_title || '" has been approved. ₹' || to_char(v_reward, 'FM99,99,999') || ' has been added to your wallet!',
      '/wallet',
      'success'
    );
  END IF;

  -- Case 5: Client Rejects Work & Reopens/Cancels Task -> Notify Freelancer
  IF (OLD.status IN ('submitted', 'revision_requested', 'in_progress') AND NEW.status IN ('open', 'cancelled') AND OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    VALUES (
      OLD.assigned_to,
      'Submission Rejected',
      'Your work on "' || v_task_title || '" was not accepted by the client.',
      '/my-tasks',
      'error'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_task_state_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_state_change();
