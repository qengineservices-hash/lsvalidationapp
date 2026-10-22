import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { requestId, newVlId, reason } = await request.json();

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get current request data
    const { data: currentRequest, error: fetchErr } = await supabase
      .from("app_validation_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchErr || !currentRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const oldVlId = currentRequest.assigned_to;

    // 2. Perform Reassignment in transaction (using separate calls since we don't have stored procedures here)
    // Update Validation Request
    const { error: updateErr } = await supabase
      .from("app_validation_requests")
      .update({ 
        assigned_to: newVlId, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", requestId);

    if (updateErr) throw updateErr;

    // Update Draft Quotes
    const { error: quoteErr } = await supabase
      .from("quotes")
      .update({ created_by: newVlId })
      .eq("validation_request_id", requestId)
      .eq("status", "draft");

    if (quoteErr) console.warn("Failed to update related draft quotes", quoteErr);

    // 3. Log the change
    const { error: logErr } = await supabase
      .from("vl_reassignment_log")
      .insert({
        validation_request_id: requestId,
        old_vl_id: oldVlId,
        new_vl_id: newVlId,
        changed_by: currentUser.id,
        reason: reason || "No reason provided"
      });

    if (logErr) console.warn("Failed to log reassignment", logErr);

    // 4. Send Notifications
    // fetch user names for notifications
    const { data: users } = await supabase.from("profiles").select("id, full_name").in("id", [oldVlId, newVlId, currentUser.id]);
    const oldVlName = users?.find(u => u.id === oldVlId)?.full_name || "Old VL";
    const newVlName = users?.find(u => u.id === newVlId)?.full_name || "New VL";
    const vmName = users?.find(u => u.id === currentUser.id)?.full_name || "Validation Manager";

    // Notification to Old VL
    await supabase.from("notifications").insert({
      user_id: oldVlId,
      title: "Project Reassigned",
      message: `Project ${currentRequest.pid} has been reassigned to ${newVlName}.`,
      type: "reassignment",
      metadata: { requestId, pid: currentRequest.pid }
    });

    // Notification to New VL
    await supabase.from("notifications").insert({
      user_id: newVlId,
      title: "New Project Assignment",
      message: `You have been assigned to project ${currentRequest.pid} by ${vmName}. Validation is currently ${currentRequest.status}.`,
      type: "assignment",
      metadata: { requestId, pid: currentRequest.pid }
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Reassignment Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
