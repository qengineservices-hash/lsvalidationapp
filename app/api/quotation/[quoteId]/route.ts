import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { quoteId } = params;

    // Fetch the quote (RLS will ensure access)
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Fetch line items
    const { data: lineItems, error: itemsError } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    return NextResponse.json({ quote, lineItems: lineItems || [] });
  } catch (error: any) {
    console.error("Fetch Quote Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
