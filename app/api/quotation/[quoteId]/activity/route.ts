import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { quoteId: string } }
) {
  const { quoteId } = params;

  try {
    // 1. Get the quote itself for base timestamps
    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("id, quote_number, project_id, status, created_at, updated_at")
      .eq("id", quoteId)
      .single();

    if (qErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // 2. Get version snapshots
    const { data: snapshots } = await supabase
      .from("quote_version_snapshots")
      .select("id, version_number, action, created_at, created_by")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });

    // 3. Get access record
    const { data: access } = await supabase
      .from("designer_quote_access")
      .select("created_at, first_accessed_at, payment_confirmed_at, payment_confirmed_by_name, designer_email")
      .eq("quote_id", quoteId)
      .maybeSingle();

    // 4. Build chronological activity log
    const activity: { timestamp: string; action: string; detail: string; type: string }[] = [];

    // Quote creation
    activity.push({
      timestamp: quote.created_at,
      action: "Quote Created",
      detail: `Quote ${quote.quote_number} was created for project ${quote.project_id}.`,
      type: "creation"
    });

    // Version snapshots
    if (snapshots) {
      snapshots.forEach(snap => {
        activity.push({
          timestamp: snap.created_at,
          action: snap.action || `Version ${snap.version_number}`,
          detail: `Snapshot v${snap.version_number} recorded.`,
          type: "snapshot"
        });
      });
    }

    // Sent to designer
    if (access) {
      activity.push({
        timestamp: access.created_at,
        action: "Sent to Designer",
        detail: `Magic link generated and sent to ${access.designer_email}.`,
        type: "sent"
      });

      if (access.first_accessed_at) {
        activity.push({
          timestamp: access.first_accessed_at,
          action: "Designer Opened",
          detail: `Designer first accessed the quotation link.`,
          type: "accessed"
        });
      }

      if (access.payment_confirmed_at) {
        activity.push({
          timestamp: access.payment_confirmed_at,
          action: "Payment Confirmed",
          detail: `10% advance payment confirmed by ${access.payment_confirmed_by_name || "Designer"}.`,
          type: "payment"
        });
      }
    }

    // Sort all events chronologically
    activity.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      quote_id: quoteId,
      quote_number: quote.quote_number,
      current_status: quote.status,
      activity,
      snapshots: snapshots || [],
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
