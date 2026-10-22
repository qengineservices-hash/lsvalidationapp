import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notifyQuoteSentToDesigner } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const actingUserId = user?.id || body.user_id || null;

    const { quoteId } = params;

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get current quote 
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError) throw quoteError;

    const { data: validationRequest, error: validationError } = await supabase
      .from("app_validation_requests")
      .select("data")
      .eq("id", quote.validation_request_id)
      .single();

    if (validationError) throw validationError;

    const valData = validationRequest?.data || {};
    const designerId = valData?.requested_by || null;

    let designerEmail = valData?.formData?.project?.designerEmail || "";

    if (designerId && !designerEmail) {
      const { data: profileData } = await admin
        .from("profiles")
        .select("email")
        .eq("id", designerId)
        .maybeSingle();

      designerEmail = profileData?.email || designerEmail;
    }

    if (designerId && !designerEmail) {
      const { data: appUserData } = await admin
        .from("app_users")
        .select("email")
        .eq("id", designerId)
        .maybeSingle();

      designerEmail = appUserData?.email || designerEmail;
    }

    if (!designerEmail) {
      return NextResponse.json({ error: "Designer email not found for this quotation." }, { status: 400 });
    }

    // Generate token securely
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    // Replace any existing magic-link rows for this quote. The table does not
    // have a unique constraint on quote_id in all environments, so upsert is unsafe.
    const { error: deleteAccessError } = await admin
      .from("designer_quote_access")
      .delete()
      .eq("quote_id", quoteId);

    if (deleteAccessError) throw deleteAccessError;

    const { error: accessError } = await admin
      .from("designer_quote_access")
      .insert({
        quote_id: quoteId,
        designer_email: designerEmail,
        access_token: token,
        token_expires_at: expiresAt.toISOString()
      });

    if (accessError) throw accessError;

    const { data: lineItems } = await supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quoteId);

    await supabase.from("quote_version_snapshots").insert({
      quote_id: quoteId,
      version_number: quote.version,
      action: "sent_to_designer",
      snapshot_data: { quote, line_items: lineItems || [] },
      created_by: actingUserId || quote.created_by
    });

    // Update Quote Status
    const { data, error } = await supabase
      .from("quotes")
      .update({ 
        status: "sent_to_designer", 
        sent_to_designer_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", quoteId)
      .select("*")
      .single();

    if (error) throw error;

    // Notify Designer natively inside app
    if (designerId) {
      await notifyQuoteSentToDesigner(quoteId, designerId);
    }
    
    // In actual implementation, trigger email API here

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Send Quote Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
