import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient();
    const { token } = params;
    const { confirmed_by, notes } = await request.json();

    if (!confirmed_by) {
      return NextResponse.json({ error: "Name is required for confirmation." }, { status: 400 });
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
        payment_notes: notes || null
      })
      .eq("id", accessRecord.id);

    if (updateAccessErr) throw updateAccessErr;

    // 3. Update Quotes table status
    const { data: quote, error: updateQuoteErr } = await supabase
      .from("quotes")
      .update({
        status: "payment_confirmed",
        payment_confirmed_at: confirmTime
      })
      .eq("id", accessRecord.quote_id)
      .select("project_id, created_by, vm_id, total, validation_request_id")
      .single();

    if (updateQuoteErr) throw updateQuoteErr;

    // UPDATE: Set the validation request status to 'payment_confirmed'
    if (quote.validation_request_id) {
      await supabase
        .from("app_validation_requests")
        .update({ status: "payment_confirmed" })
        .eq("id", quote.validation_request_id);
    }

    // 4. MOCK NOTIFICATION EMAIL
    console.log(`
      =======================================================
      [MOCK NOTIFICATION SYSTEM] — Payment Confirmed
      =======================================================
      To: VL (${quote.created_by}), VM (${quote.vm_id})
      Subject: Payment Confirmed — ${quote.project_id}
      
      Hi Team,
      
      The advance payment for project ${quote.project_id} has been confirmed 
      by the designer (${confirmed_by}).
      
      Confirmed Date: ${new Date(confirmTime).toLocaleString()}
      Quote Total: ₹${quote.total}
      Notes: ${notes || "None"}
      
      The quote is now locked. The Validation Lead can proceed 
      with the formal project delivery.
      =======================================================
    `);

    return NextResponse.json({ success: true, confirmed_at: confirmTime });

  } catch (error: any) {
    console.error("Payment Confirmation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
