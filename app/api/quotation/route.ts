import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { validation_request_id, project_id, city_id, stage, vm_id, user_id } = body;

    const currentUserId = user?.id || user_id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized: No user identity found" }, { status: 401 });
    }

    if (!validation_request_id || !stage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Rely on RLS 'VLs can insert own quotes'.
    // The trigger will auto-generate quote_number
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        validation_request_id,
        project_id,
        city_id,
        stage,
        vm_id,
        created_by: currentUserId,
        status: "draft"
      })
      .select("*")
      .single();

    if (error) throw error;

    // UPDATE: Set the validation request status to 'quote_generated'
    await supabase
      .from("app_validation_requests")
      .update({ status: "quote_generated" })
      .eq("id", validation_request_id);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Create Quotation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
