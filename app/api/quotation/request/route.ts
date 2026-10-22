import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { requestId } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get request and designer info
    const { data: vReq, error: fetchErr } = await supabase
      .from("app_validation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchErr || !vReq) {
      return NextResponse.json({ error: "Validation request not found" }, { status: 404 });
    }

    const { data: designerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const designerName = designerProfile?.full_name || "A Designer";

    // 2. Update Request
    const { error: updateErr } = await supabase
      .from("app_validation_requests")
      .update({
        quote_requested_at: new Date().toISOString(),
        quote_requested_by: user.id
      })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    // 3. Notify VL
    if (vReq.assigned_to) {
      await supabase.from("notifications").insert({
        user_id: vReq.assigned_to,
        title: `Quote Requested — ${vReq.pid}`,
        message: `${designerName} has requested a quotation for project ${vReq.pid}.`,
        type: "quote_request",
        metadata: { requestId, pid: vReq.pid }
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Quote Request Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
