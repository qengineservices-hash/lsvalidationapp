import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const cityId = searchParams.get('cityId'); // Can be null for global search

    let dbQuery = supabase
      .from('mrc_items')
      .select(`
        *,
        mrc_categories!inner(name),
        mrc_sub_categories(name)
      `)
      .eq('is_active', true);

    // Apply city filter (either matches specific city, or is global null)
    if (cityId) {
       dbQuery = dbQuery.or(`city_id.eq.${cityId},city_id.is.null`);
    } else {
       dbQuery = dbQuery.is('city_id', null);
    }

    if (category) {
       dbQuery = dbQuery.eq('mrc_categories.name', category);
    }

    if (query) {
      dbQuery = dbQuery.or(`sku_code.ilike.%${query}%,sku_name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Limit to 50 results to prevent massive payloads
    const { data, error } = await dbQuery.limit(50);

    if (error) throw error;

    // Transform relation names into the flattend shape expected by UI
    const transformed = (data || []).map((item: any) => ({
      ...item,
      category_name: item.mrc_categories?.name,
      sub_category_name: item.mrc_sub_categories?.name
    }));

    return NextResponse.json(transformed);
  } catch (error: any) {
    console.error("MRC Search Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
