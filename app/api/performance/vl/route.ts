import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month"); // Format: YYYY-MM
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const selectedDate = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const monthStart = startOfMonth(selectedDate).toISOString();
    const monthEnd = endOfMonth(selectedDate).toISOString();

    // 1. Validation Metrics
    // Requests Received in month
    const { count: receivedCount } = await supabase
      .from("app_validation_requests")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);

    // Validations Completed in month (based on status transition or updated_at)
    // We'll use status in (validation_done, report_generated, quote_generated, payment_confirmed) 
    // and updated_at in range.
    const { count: completedCount } = await supabase
      .from("app_validation_requests")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .in("status", ["validation_done", "report_generated", "quote_generated", "payment_confirmed"])
      .gte("updated_at", monthStart)
      .lte("updated_at", monthEnd);

    // 2. Quote Metrics
    // Quotes Created
    const { count: quotesCreated } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);

    // Quotes with Payment Confirmed
    const { count: paymentConfirmedCount, data: confirmedQuotes } = await supabase
      .from("quotes")
      .select("total")
      .eq("created_by", user.id)
      .eq("status", "payment_confirmed")
      .gte("payment_50_confirmed_at", monthStart)
      .lte("payment_50_confirmed_at", monthEnd);

    // Calculate GMV
    const gmv = confirmedQuotes?.reduce((sum, q) => sum + Number(q.total || 0), 0) || 0;

    // 3. Quality Metrics (Rejection Rate)
    // total_submitted: count transitions out of draft? 
    // For simplicity, let's count snapshots with action 'submission' or quotes that aren't draft.
    // user said: "rejected by VM / total quotes submitted * 100"
    // We'll count total versions > 1 or something? 
    // Better: count all snapshots where action was a submission attempt.
    const { count: submittedCount } = await supabase
      .from("quote_version_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)
      .in("action", ["submitted_for_approval", "submitted_for_nm_approval"])
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);

    const { count: rejectedCount } = await supabase
      .from("quote_version_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("action", "rejected")
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd);

    const rejectionRate = submittedCount && submittedCount > 0 
      ? (Number(rejectedCount || 0) / submittedCount) * 100 
      : 0;

    // 4. Trend Data (Last 6 Months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(selectedDate, i);
      const s = startOfMonth(d).toISOString();
      const e = endOfMonth(d).toISOString();

      const { count: valDone } = await supabase
        .from("app_validation_requests")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .in("status", ["validation_done", "report_generated", "quote_generated", "payment_confirmed"])
        .gte("updated_at", s)
        .lte("updated_at", e);

      const { count: quoteConf } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("status", "payment_confirmed")
        .gte("payment_50_confirmed_at", s)
        .lte("payment_50_confirmed_at", e);

      trend.push({
        month: format(d, "MMM"),
        validations: valDone || 0,
        quotes: quoteConf || 0
      });
    }

    return NextResponse.json({
      metrics: {
        receivedCount: receivedCount || 0,
        completedCount: completedCount || 0,
        quotesCreated: quotesCreated || 0,
        paymentConfirmedCount: paymentConfirmedCount || 0,
        rejectionRate,
        reworkCount: rejectedCount || 0,
        gmv
      },
      trend
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
