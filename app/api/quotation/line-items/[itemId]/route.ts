import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();


    const { itemId } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from("quote_line_items")
      .update(body)
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update Line Item Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();


    const { itemId } = params;

    const { error } = await supabase
      .from("quote_line_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Line Item Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
