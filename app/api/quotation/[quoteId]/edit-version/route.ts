import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
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

    const { data: lineItems, error: itemsErr } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId);

    if (itemsErr) {
      return NextResponse.json({ error: "Failed to fetch line items for snapshot" }, { status: 500 });
    }

    // 2. Insert into quote_version_snapshots
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    const snapshotData = {
      quote,
      line_items: lineItems
    };

    const { error: snapErr } = await supabase
      .from("quote_version_snapshots")
      .insert({
        quote_id: quoteId,
        version_number: quote.version,
        action: 'pre_edit_snapshot',
        snapshot_data: snapshotData,
        created_by: currentUserId
      });

    if (snapErr) {
      console.error("Snapshot Error:", snapErr);
      return NextResponse.json({ error: "Failed to create version snapshot" }, { status: 500 });
    }

    // 3. Update Quote: Bump version, status = draft, clear other flags?
    // We keep historical fields in the quote? No, they are in the snapshot now.
    // The prompt says: Set quotes.version = version + 1, status = 'draft'.
    const { error: updateQuoteErr } = await supabase
      .from("quotes")
      .update({
        version: quote.version + 1,
        status: 'draft',
        // Clear payment flags for the new version
        payment_confirmed_at: null,
        payment_50_confirmed_at: null,
        payment_50_confirmed_by: null,
        payment_50_scope_agreed: false,
        kom_date: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", quoteId);

    if (updateQuoteErr) {
      return NextResponse.json({ error: "Failed to update quote version" }, { status: 500 });
    }

    // 4. Kill the Magic Link (Designer access)
    // "If VL clicks Edit and creates a new version, does the Designer Access Magic Link die? (Yes)"
    await supabase
      .from("designer_quote_access")
      .delete()
      .eq("quote_id", quoteId);

    return NextResponse.json({ 
      success: true, 
      new_version: quote.version + 1,
      message: `Version ${quote.version} snapshotted. Now editing Version ${quote.version + 1}.`
    });

  } catch (error: any) {
    console.error("Edit Version Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
