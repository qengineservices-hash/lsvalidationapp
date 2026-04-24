import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const itemData = await request.json();
    
    // Server will enforce RLS implicitly (must own the quote contextually via quote_id)
    const { data, error } = await supabase
      .from("quote_line_items")
      .insert(itemData)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Add Line Item Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
