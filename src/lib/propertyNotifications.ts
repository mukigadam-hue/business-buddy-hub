import { supabase } from '@/integrations/supabase/client';

/**
 * Send a notification to BOTH the asset owner's business AND any business
 * the renter is a member of. Used throughout the FlexRent booking +
 * negotiation flow so neither side misses an update.
 *
 * Mirrors the cross-business notification pattern used in Sales/Orders.
 */
export async function sendBookingNotification(
  booking: { business_id: string; renter_id?: string | null },
  title: string,
  message: string,
  type: string = 'booking'
) {
  try {
    // Always notify the owner's business
    await supabase.from('notifications').insert({
      business_id: booking.business_id,
      title,
      message,
      type,
    } as any);

    // Notify every business the renter belongs to (so they see it in their bell)
    if (booking.renter_id) {
      const { data: memberships } = await supabase
        .from('business_memberships')
        .select('business_id')
        .eq('user_id', booking.renter_id);
      for (const m of memberships || []) {
        if (m.business_id !== booking.business_id) {
          await supabase.from('notifications').insert({
            business_id: m.business_id,
            title,
            message,
            type,
          } as any);
        }
      }
    }
  } catch (e) {
    // Notifications are best-effort — never block the user flow.
    console.warn('sendBookingNotification failed', e);
  }
}
