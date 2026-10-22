import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { quoteId } = params;

    // 1. Fetch current quote and line items for snapshot
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId);

    // 2. Insert Snapshot
    await supabase.from("quote_version_snapshots").insert({
      quote_id: quoteId,
      version_number: quote.version,
      action: "submitted_for_approval",
      snapshot_data: { quote, line_items: lineItems || [] },
      created_by: user.id
    });

    // 3. Update status
    const { data, error } = await supabase
      .from("quotes")
      .update({ status: "pending_vm_approval" })
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
