import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient();
    const { token } = params;

    // 1. Validate Token and check expiration
    const { data: accessRecord, error: accessErr } = await supabase
      .from("designer_quote_access")
      .select("*")
      .eq("access_token", token)
      .single();

    if (accessErr || !accessRecord) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(accessRecord.token_expires_at);

    if (now > expiresAt) {
      return NextResponse.json({ error: "This link has expired. Please request a new one." }, { status: 410 });
    }

    // 2. Fetch Quote Details
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", accessRecord.quote_id)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quotation data not found." }, { status: 404 });
    }

    // 3. Fetch Line Items
    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quote.id)
      .order("display_order", { ascending: true });

    // 4. Fetch Project details from validation requests to get Customer Name, etc.
    let validationDetails = {};
    if (quote.validation_request_id) {
      const { data: valReq } = await supabase
        .from("app_validation_requests")
        .select("data")
        .eq("id", quote.validation_request_id)
        .maybeSingle();
      
      if (valReq && valReq.data) {
        validationDetails = {
           customer_name: valReq.data.customer_name || valReq.data.formData?.project?.customerName || "N/A",
           city_id: valReq.data.city_id,
           pid: valReq.data.pid || valReq.data.formData?.project?.pid || quote.project_id
        }
      }
    }

    // 5. Update first_accessed_at if it's null
    if (!accessRecord.first_accessed_at) {
      await supabase
        .from("designer_quote_access")
        .update({ first_accessed_at: new Date().toISOString() })
        .eq("id", accessRecord.id);
    }

    return NextResponse.json({
      accessRecord,
      quote,
      lineItems: lineItems || [],
      validationDetails
    });

  } catch (error: any) {
    console.error("Quote View Token Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
