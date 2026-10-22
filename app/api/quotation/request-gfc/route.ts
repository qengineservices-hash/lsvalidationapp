import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { quoteId } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch Quote
    const { data: quote, error: fetchErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (fetchErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // 2. Insert GFC Request
    const { error: gfcErr } = await supabase
      .from("gfc_requests")
      .insert({
        quote_id: quoteId,
        requested_by: user.id
      });

    if (gfcErr) throw gfcErr;

    // 3. Update Quote
    await supabase
      .from("quotes")
      .update({
        gfc_requested_at: new Date().toISOString(),
        status: "gfc_requested"
      })
      .eq("id", quoteId);

    // 4. Notify VM
    const { data: designerProfile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    const designerName = designerProfile?.full_name || "A Designer";

    if (quote.vm_id) {
      await supabase.from("notifications").insert({
        user_id: quote.vm_id,
        title: "GFC Requested",
        message: `GFC drawings requested for project ${quote.project_id} by designer ${designerName}.`,
        type: "gfc_request",
        metadata: { quoteId, pid: quote.project_id }
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("GFC Request Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
