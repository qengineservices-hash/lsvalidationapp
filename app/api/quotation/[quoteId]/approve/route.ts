import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // In our setup, we might be relying on client-side state for auth,
    // but the server can also see the user if synced. 
    // Since RLS is off, we proceed even if user is missing, but try to extract from body fallback if needed.

    const { quoteId } = params;
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    
    const action = body.action || "approve_exception";
    const comment = body.comment || "";
    const userId = user?.id || body.user_id || null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Reviewer ID is missing." }, { status: 401 });
    }

    // BYPASS: Only attempt to store if it's a valid UUID. 
    // This prevents "invalid input syntax for type uuid" errors with mock IDs.
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const dbUserId = isUUID ? userId : null;

    // Fetch current quote
    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (fetchErr || !quote) throw new Error("Quote not found");

    if (action === "reject") {
      // 1. Insert Comment
      if (comment) {
        await supabase.from("quote_comments").insert({
          quote_id: quoteId,
          user_id: dbUserId,
          comment: comment
        });
      }

      // 2. Set back to draft
      const { error: updateErr } = await supabase
        .from("quotes")
        .update({ status: "draft" })
        .eq("id", quoteId);
        
      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, status: "draft" });
    }

    if (action === "approve_exception") {
      // Approve Non-MRC Exception. Sets to vm_approved and records nm_approved_by
      const { error: updateErr } = await supabase
        .from("quotes")
        .update({ 
          status: "vm_approved",
          nm_approved_by: dbUserId,
          nm_approved_at: new Date().toISOString()
        })
        .eq("id", quoteId);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, status: "vm_approved" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Approve Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
