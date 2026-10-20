-- ========================================================
-- TaskForge: Realtime Notifications & Database Triggers
-- Run this script in your Supabase SQL Editor
-- ========================================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast user notification feed queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_lookup 
  ON public.notifications(user_id, is_read, created_at DESC);

-- 2. Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification read status" ON public.notifications;
CREATE POLICY "Users can update their own notification read status"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role / trigger insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 3. Add table to Supabase Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- 4. Trigger Function: Notify Client when a Freelancer Applies
CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_task_title TEXT;
  v_project_id UUID;
  v_applicant_name TEXT;
BEGIN
  -- Get task and project information
  SELECT t.title, t.project_id, p.client_id
  INTO v_task_title, v_project_id, v_client_id
  FROM public.tasks t
  JOIN public.projects p ON p.id = t.project_id
  WHERE t.id = NEW.task_id;

  -- Get applicant's full name
  SELECT coalesce(full_name, 'A freelancer')
  INTO v_applicant_name
  FROM public.profiles
  WHERE id = NEW.freelancer_id;

  IF v_client_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    VALUES (
      v_client_id,
      'New Applicant 📬',
      v_applicant_name || ' applied to work on "' || v_task_title || '".',
      '/projects/' || v_project_id || '/tasks/' || NEW.task_id || '/applicants',
      'info'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_application ON public.applications;
CREATE TRIGGER trigger_notify_on_new_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_application();


-- 5. Trigger Function: Notify Users on Task State Transitions
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

DROP TRIGGER IF EXISTS trigger_notify_on_task_state_change ON public.tasks;
CREATE TRIGGER trigger_notify_on_task_state_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_state_change();
