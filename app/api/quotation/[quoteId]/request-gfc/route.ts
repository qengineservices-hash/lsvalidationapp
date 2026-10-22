import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createAdminClient();
    const serverSupabase = createClient();
    const { quoteId } = params;

    // 1. Fetch current quote
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status !== 'payment_confirmed' && quote.status !== 'locked') {
      return NextResponse.json({ error: "Payment must be confirmed before requesting GFC." }, { status: 400 });
    }

    const { data: userData } = await serverSupabase.auth.getUser();
    const userId = userData.user?.id;

    // 2. Update Quote status
    const { error: updateQuoteErr } = await supabase
      .from("quotes")
      .update({
        status: 'gfc_requested',
        gfc_requested_at: new Date().toISOString(),
        gfc_requested_by: userId
      })
      .eq("id", quoteId);

    if (updateQuoteErr) throw updateQuoteErr;

    // 2b. Sync status to app_validation_requests
    const { data: vReq } = await supabase.from("app_validation_requests").select("data").eq("id", quote.validation_request_id).single();
    if (vReq && vReq.data) {
      const updatedData = { ...vReq.data, status: "gfc_requested", updated_at: new Date().toISOString() };
      await supabase
        .from("app_validation_requests")
        .update({ data: updatedData, status: "gfc_requested", updated_at: new Date().toISOString() })
        .eq("id", quote.validation_request_id);
    }

    // 3. Insert into gfc_requests table
    const { error: gfcErr } = await supabase
      .from("gfc_requests")
      .insert({
        quote_id: quoteId,
        validation_request_id: quote.validation_request_id,
        project_id: quote.project_id,
        requested_by: userId,
        status: 'pending'
      });

    if (gfcErr) throw gfcErr;

    // 4. Notifications
    const notificationPayloads = [
      {
        user_id: quote.vm_id, // VM needs to assign DA
        type: "gfc_requested",
        title: `GFC Drawings Requested — ${quote.project_id}`,
        body: `Designer has requested GFC drawings for this project. Please assign a Design Associate.`,
        related_entity_type: "quote",
        related_entity_id: quoteId
      }
    ];
    await supabase.from("notifications").insert(notificationPayloads);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("GFC Request Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
