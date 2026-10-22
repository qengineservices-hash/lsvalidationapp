import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const serverSupabase = createClient();

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await serverSupabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User Profile (Try ID first, then Email)
    let { data: profile } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (!profile && user.email) {
      const { data: pByEmail } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", user.email)
        .single();
      profile = pByEmail;
    }

    if (!profile) {
      console.error("GFC API: Profile not found for user", user.id, user.email);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 3. Fetch All Required Data Separately (most reliable way to avoid relationship issues)
    const [gfcRes, quoteRes, vrRes] = await Promise.all([
      supabase.from("gfc_requests").select("*").order("requested_at", { ascending: false }),
      supabase.from("quotes").select("*, designer_quote_access(*)"),
      supabase.from("app_validation_requests").select("*")
    ]);

    if (gfcRes.error) throw gfcRes.error;

    const gfcRequests = gfcRes.data || [];
    const quotes = quoteRes.data || [];
    const validationRequests = vrRes.data || [];

    // 4. Manual Join & Filter
    let filtered = gfcRequests.map(gfc => {
      const quote = quotes.find(q => q.id === gfc.quote_id);
      const vrRow = validationRequests.find(v => v.id === gfc.validation_request_id);
      
      // Flatten the JSONB data and ensure ID is present
      const requestData = vrRow?.data ? {
        ...(typeof vrRow.data === 'object' ? vrRow.data : {}),
        id: vrRow.id // Ensure ID from table is used
      } : null;

      // Map designer access to match expected structure
      const designerAccess = quote?.designer_quote_access?.map((a: any) => ({
        ...a,
        sent_to_designer_at: a.created_at
      })) || [];

      return {
        ...gfc,
        quotes: quote ? {
          ...quote,
          designer_quote_access: designerAccess,
          app_validation_requests: requestData // Map the flattened data for the frontend
        } : null
      };
    });

    // 5. Role-based filtering
    if (profile.role === 'designer') {
      const { data: access } = await supabase
        .from("designer_quote_access")
        .select("quote_id")
        .eq("designer_email", profile.email);
      
      const quoteIds = access?.map(a => a.quote_id) || [];
      filtered = filtered.filter(gfc => quoteIds.includes(gfc.quote_id));
    } else if (profile.role === 'validation_lead') {
      filtered = filtered.filter(gfc => {
        const vrData = gfc.quotes?.app_validation_requests?.data;
        return vrData?.assigned_to === profile.id || gfc.validation_request_id === profile.id;
      });
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error("GFC API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
