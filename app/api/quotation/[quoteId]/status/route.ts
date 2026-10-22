import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  notifyQuoteSubmittedForApproval, 
  notifyQuoteApproved, 
  notifyQuoteRejected 
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { quoteId } = params;
    const { status, remarks, user_id } = await request.json();
    const actingUserId = user?.id || user_id || null;

    if (!actingUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    // Get current quote to verify access and get identifiers
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError) throw quoteError;

    // Build update payload
    const updatePayload: any = { status, updated_at: new Date().toISOString() };

    // Record nm_approval specific timestamp
    if (status === "pending_nm_approval") {
      updatePayload.nm_approval_requested_at = new Date().toISOString();
    }

    // Execute Update
    let { data, error } = await supabase
      .from("quotes")
      .update(updatePayload)
      .eq("id", quoteId)
      .select("*")
      .single();

    // Compatibility fallback for older DBs still using the legacy VM review status.
    if (error && status === "pending_vm_approval") {
      const legacyPayload = { ...updatePayload, status: "pending_vm_review" };
      const retry = await supabase
        .from("quotes")
        .update(legacyPayload)
        .eq("id", quoteId)
        .select("*")
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Send relevant notification
    if (status === "pending_vm_approval" || status === "pending_nm_approval") {
       if (quote.vm_id) notifyQuoteSubmittedForApproval(quoteId, quote.vm_id);

       const { data: lineItems } = await supabase
         .from("quote_line_items")
         .select("*")
         .eq("quote_id", quoteId);

       await supabase.from("quote_version_snapshots").insert({
         quote_id: quoteId,
         version_number: quote.version,
         action: status === "pending_nm_approval" ? "submitted_for_nm_approval" : "submitted_for_approval",
         snapshot_data: { quote, line_items: lineItems || [] },
         created_by: actingUserId || quote.created_by
       });
    } 
    else if (status === "vm_approved" && quote.created_by) {
       notifyQuoteApproved(quoteId, quote.created_by);
    }
    else if (status === "draft" && quote.created_by) {
       // This is a REJECTION by VM
       notifyQuoteRejected(quoteId, quote.created_by, remarks || "Changes requested by manager.");
       
       const { data: lineItems } = await supabase.from("quote_line_items").select("*").eq("quote_id", quoteId);
       await supabase.from("quote_version_snapshots").insert({
         quote_id: quoteId,
         version_number: quote.version,
         action: "rejected",
         snapshot_data: { quote, line_items: lineItems || [] },
         created_by: actingUserId || quote.created_by
       });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update Status Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
