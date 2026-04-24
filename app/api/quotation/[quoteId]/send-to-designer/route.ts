import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { quoteId } = params;

    // Fetch quote to snapshot it
    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (fetchErr || !quote) throw new Error("Quote not found");

    // Also fetch line items for the snapshot
    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId);

    // 1. Snapshot the quote
    const snapshotData = {
      quote,
      lineItems: lineItems || []
    };

    const { error: snapErr } = await supabase
      .from("quote_version_snapshots")
      .insert({
        quote_id: quoteId,
        version_number: quote.version,
        snapshot_data: snapshotData,
        action: "sent_to_designer"
      });

    if (snapErr) console.error("Failed to snapshot quote:", snapErr);

    // 2. Generate Access Token and Designer Access Record
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    // Fetch designer email from validation request
    const { data: valReq } = await supabase
      .from("app_validation_requests")
      .select("data")
      .eq("id", quote.validation_request_id)
      .single();

    const designerUserId = valReq?.data?.requested_by;
    let designerEmail = "designer@livspace.com"; // Fallback

    if (designerUserId) {
      const { data: userData } = await supabase
        .from("app_users")
        .select("email")
        .eq("id", designerUserId)
        .single();
      
      if (userData?.email) {
        designerEmail = userData.email;
      }
    }

    const { error: accessErr } = await supabase
      .from("designer_quote_access")
      .insert({
        quote_id: quoteId,
        designer_email: designerEmail,
        access_token: token,
        token_expires_at: expiresAt.toISOString()
      });

    if (accessErr) throw accessErr;

    // 3. Update Status
    const { error: updateErr } = await supabase
      .from("quotes")
      .update({
        status: "sent_to_designer",
        sent_to_designer_at: new Date().toISOString()
      })
      .eq("id", quoteId);

    if (updateErr) throw updateErr;

    // 4. MOCK EMAIL SENDING
    const magicLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/quote-view?token=${token}`;
    
    console.log(`
      =======================================================
      [MOCK EMAIL SYSTEM] — Outbound Email Triggered
      =======================================================
      To: ${designerEmail}
      Subject: Quotation Ready — ${quote.project_id}
      
      Hi Designer,
      
      The quotation for project ${quote.project_id} has been reviewed and approved.
      
      Total Quote Value: ₹${quote.total}
      
      Please click the link below to view the full quotation and confirm 
      the 10% advance payment to proceed:
      
      [View Quotation & Confirm Payment] → ${magicLink}
      
      This link expires in 30 days.
      
      Regards,
      Validation Manager | Livspace Services
      =======================================================
    `);

    return NextResponse.json({ success: true, status: "sent_to_designer", magicLink });
  } catch (error: any) {
    console.error("Send to Designer Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
