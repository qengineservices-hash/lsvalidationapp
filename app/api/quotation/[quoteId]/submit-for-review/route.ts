import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { quoteId } = params;

    // A real implementation would verify rule engines, e.g. checking if all rooms have > 0 items
    const { data, error } = await supabase
      .from("quotes")
      .update({ status: "pending_vm_review" })
      .eq("id", quoteId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Submit for Review Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
