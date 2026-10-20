'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function useTaskRealtime(taskId: string, initialStatus: string) {
  const [status, setStatus] = useState<string>(initialStatus);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-live:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated?.status) {
            setStatus(updated.status);
            // Refresh Next.js server components cache so server data stays in sync
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase, router]);

  return { status };
}
