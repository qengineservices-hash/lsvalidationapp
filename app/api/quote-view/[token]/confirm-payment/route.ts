import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createAdminClient();
    const { token } = params;
    const { confirmed_by, notes, kom_date } = await request.json();

    if (!confirmed_by || !kom_date) {
      return NextResponse.json({ error: "Name and KOM Date are required." }, { status: 400 });
    }

    // 1. Validate Token 
    const { data: accessRecord, error: accessErr } = await supabase
      .from("designer_quote_access")
      .select("*")
      .eq("access_token", token)
      .single();

    if (accessErr || !accessRecord) {
      return NextResponse.json({ error: "Invalid token." }, { status: 404 });
    }

    // 1b. Token expiry check (same as GET)
    if (accessRecord.token_expires_at) {
      const now = new Date();
      const expiresAt = new Date(accessRecord.token_expires_at);
      if (now > expiresAt) {
        return NextResponse.json({ error: "This link has expired. Please request a new one." }, { status: 410 });
      }
    }

    if (accessRecord.payment_confirmed_at) {
      return NextResponse.json({ error: "Payment already confirmed for this token." }, { status: 400 });
    }

    // 2. Update Access Record
    const confirmTime = new Date().toISOString();
    
    const { error: updateAccessErr } = await supabase
      .from("designer_quote_access")
      .update({
        payment_confirmed_at: confirmTime,
        payment_confirmed_by_name: confirmed_by,
        payment_notes: notes || null,
      })
      .eq("id", accessRecord.id);

    if (updateAccessErr) throw updateAccessErr;

    // 3. Update Quotes table status
    const { data: quote, error: updateQuoteErr } = await supabase
      .from("quotes")
      .update({
        status: "payment_confirmed",
        payment_confirmed_at: confirmTime,
        payment_50_confirmed_at: confirmTime,
        payment_50_scope_agreed: true,
        kom_date: kom_date,
        // Used by designer dashboard as "Ref No."
        payment_reference: notes || null,
      })
      .eq("id", accessRecord.quote_id)
      .select("project_id, created_by, vm_id, total, validation_request_id")
      .single();

    if (updateQuoteErr) throw updateQuoteErr;

    // UPDATE: Set the validation request status to 'payment_confirmed'
    if (quote.validation_request_id) {
      const { data: vReq } = await supabase.from("app_validation_requests").select("data").eq("id", quote.validation_request_id).single();
      if (vReq && vReq.data) {
        const updatedData = { ...vReq.data, status: "payment_confirmed", updated_at: new Date().toISOString() };
        await supabase
          .from("app_validation_requests")
          .update({ data: updatedData, status: "payment_confirmed", updated_at: new Date().toISOString() })
          .eq("id", quote.validation_request_id);
      }
    }

    // 4. Create In-App Notifications for VL and VM
    const notificationPayloads = [quote.created_by, quote.vm_id]
      .filter(Boolean)
      .map((user_id) => ({
        user_id,
        type: "payment_confirmed",
        title: `50% payment confirmed — ${quote.project_id}`,
        body: `Designer confirmed advance payment. KOM date: ${new Date(kom_date).toLocaleDateString()}. Work can now begin.`,
        related_entity_type: "quote",
        related_entity_id: accessRecord.quote_id,
      }));

    if (notificationPayloads.length) {
      const { error: nErr } = await supabase.from("notifications").insert(notificationPayloads);
      if (nErr) {
        console.warn("Failed to insert notifications:", nErr);
      }
    }

    // 4. MOCK NOTIFICATION EMAIL
    console.log(`
      =======================================================
      [MOCK NOTIFICATION SYSTEM] — 50% Payment Confirmed
      =======================================================
      To: VL (${quote.created_by}), VM (${quote.vm_id})
      Subject: 50% payment confirmed — ${quote.project_id}
      
      Hi Team,
      
      Designer confirmed advance payment. KOM date: ${new Date(kom_date).toLocaleDateString()}. 
      Work can now begin.
      
      Confirmed Date: ${new Date(confirmTime).toLocaleString()}
      Quote Total: ₹${quote.total}
      Notes: ${notes || "None"}
      =======================================================
    `);

    return NextResponse.json({ success: true, confirmed_at: confirmTime });

  } catch (error: any) {
    console.error("Payment Confirmation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
