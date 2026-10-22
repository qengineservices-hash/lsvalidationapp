import { createClient } from '@supabase/supabase-js';

// Helper to get admin client (lazy initialization)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error("Supabase admin credentials missing");
  }
  
  return createClient(url, key);
}

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  entityType?: string,
  entityId?: string
) {
  try {
    const { error } = await getAdminClient().rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_entity_type: entityType,
      p_entity_id: entityId,
    });
    if (error) {
      console.error('Error sending notification:', error);
    }
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

export async function sendNotificationToRole(
  role: string,
  cityId: string | null,
  type: string,
  title: string,
  body: string,
  entityType?: string,
  entityId?: string
) {
  try {
    let query = getAdminClient().from('profiles').select('id').eq('role', role);
    // Optionally filter by city tagging if applicable (depends on how city matching is implemented, 
    // assuming profiles have city association or keeping it broad if not explicitly in profiles).
    // For simplicity, if city tags are complex, we fetch all users of a role for now or rely on a helper.
    // If profiles table has city_id we'd do: if (cityId) query = query.eq('city_id', cityId); 
    
    // As per context, `getVlsForVm` uses separate tagging logic. We will select all users in the role
    // and rely on specific user assignment when possible. If exact role cast is needed, we do it here.
    const { data: users, error } = await query;
    
    if (error || !users) return;

    // Fire notifications concurrently
    await Promise.all(
      users.map(u => 
        sendNotification(u.id, type, title, body, entityType, entityId)
      )
    );
  } catch (err) {
    console.error('Error sending role notifications:', err);
  }
}

// ----------------------------------------------------
// Common Pre-Built Notification Senders
// ----------------------------------------------------

export function notifyQuoteSubmittedForApproval(quoteId: string, vmId: string) {
  return sendNotification(
    vmId,
    'quote_submitted',
    'Quote Ready for Review',
    'A validation lead has submitted a quote for your approval.',
    'quote',
    quoteId
  );
}

export function notifyQuoteApproved(quoteId: string, vlId: string) {
  return sendNotification(
    vlId,
    'quote_approved',
    'Quote Approved',
    'Your submitted quote has been approved by the manager.',
    'quote',
    quoteId
  );
}

export function notifyQuoteRejected(quoteId: string, vlId: string, reason: string) {
  return sendNotification(
    vlId,
    'quote_rejected',
    'Quote Rejected',
    `Your quote was sent back. Reason: ${reason}`,
    'quote',
    quoteId
  );
}

export function notifyQuoteSentToDesigner(quoteId: string, designerId: string) {
  return sendNotification(
    designerId,
    'quote_sent',
    'New Quotation Received',
    'Your validation request quotation is ready to view.',
    'quote',
    quoteId
  );
}

export function notifyPaymentConfirmed(quoteId: string, vlId: string, vmId: string) {
  // Notify both VL and VM
  sendNotification(
    vlId,
    'payment_confirmed',
    'Payment Confirmed',
    'The designer has confirmed payment for a quote.',
    'quote',
    quoteId
  );
  sendNotification(
    vmId,
    'payment_confirmed',
    'Payment Confirmed',
    'The designer has confirmed payment for a quote.',
    'quote',
    quoteId
  );
}

export function notifyGFCRequested(gfcId: string, vmId: string) {
  return sendNotification(
    vmId,
    'gfc_requested',
    'GFC Drawings Requested',
    'A request for GFC drawings has been initiated. Please assign a DA.',
    'gfc',
    gfcId
  );
}

export function notifyDAAssigned(gfcId: string, daId: string) {
  return sendNotification(
    daId,
    'gfc_assigned',
    'GFC Assigned',
    'You have been assigned to prepare GFC drawings for a project.',
    'gfc',
    gfcId
  );
}

export function notifyGFCUploaded(gfcId: string, vlId: string, vmId: string) {
  sendNotification(
    vlId,
    'gfc_uploaded',
    'GFC Drawings Uploaded',
    'The Design Associate has uploaded the GFC drawings for review.',
    'gfc',
    gfcId
  );
  sendNotification(
    vmId,
    'gfc_uploaded',
    'GFC Drawings Uploaded',
    'The Design Associate has uploaded the GFC drawings for review.',
    'gfc',
    gfcId
  );
}

export function notifyGFCApproved(gfcId: string, designerId: string) {
  return sendNotification(
    designerId,
    'gfc_approved',
    'GFC Drawings Ready',
    'The GFC drawings for your validation request are now available.',
    'gfc',
    gfcId
  );
}

export function notifyVLChanged(requestId: string, newVlId: string, oldVlId?: string) {
  sendNotification(
    newVlId,
    'vl_changed',
    'Assigned to Validation',
    'You have been assigned to a site validation request.',
    'validation_request',
    requestId
  );
  if (oldVlId) {
    sendNotification(
      oldVlId,
      'vl_changed',
      'Unassigned from Validation',
      'You are no longer assigned to this site validation request.',
      'validation_request',
      requestId
    );
  }
}
