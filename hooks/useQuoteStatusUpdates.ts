import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useQuoteStatusUpdates(userId: string | undefined, onUpdate?: () => void) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel('vl-quote-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quotes', filter: `created_by=eq.${userId}` },
        (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          if (newStatus === 'payment_confirmed' && oldStatus !== 'payment_confirmed') {
            setToastMessage(`🎉 Designer confirmed payment for Project ID: ${payload.new.project_id}! You can now download the final quotation.`);
            // Auto hide after 6 seconds
            setTimeout(() => setToastMessage(null), 6000);
          }
          
          if (newStatus !== oldStatus) {
            // Trigger optional refetch logic
            if (onUpdate) onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);

  return { toastMessage, clearToast: () => setToastMessage(null) };
}
