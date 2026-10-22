import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month"); // Format: YYYY-MM
    const targetVlId = searchParams.get("vlId"); // Optional: filter by specific VL
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const selectedDate = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const monthStart = startOfMonth(selectedDate).toISOString();
    const monthEnd = endOfMonth(selectedDate).toISOString();

    // 1. Get VL IDs for this VM
    const { data: assignments } = await supabase
      .from("app_vm_vl_assignments")
      .select("vl_id, profiles(full_name)")
      .eq("vm_id", user.id)
      .eq("is_active", true);

    const allVlIds = assignments?.map(a => a.vl_id) || [];
    const vlInfoMap = assignments?.reduce((acc: any, a: any) => {
      const prof = a.profiles as any;
      acc[a.vl_id] = Array.isArray(prof) ? prof[0]?.full_name : prof?.full_name || "Unknown";
      return acc;
    }, {}) || {};

    // Filter by specific VL if requested, otherwise use all
    const activeVlIds = targetVlId ? [targetVlId] : allVlIds;

    if (activeVlIds.length === 0) {
      return NextResponse.json({ metrics: {}, teamBreakdown: [], trend: [] });
    }

    // 2. Fetch Aggregated Metrics for activeVlIds
    const fetchMetricsForIds = async (ids: string[], start: string, end: string) => {
      const { count: received } = await supabase
        .from("app_validation_requests")
        .select("*", { count: "exact", head: true })
        .in("assigned_to", ids)
        .gte("created_at", start)
        .lte("created_at", end);

      const { count: completed } = await supabase
        .from("app_validation_requests")
        .select("*", { count: "exact", head: true })
        .in("assigned_to", ids)
        .in("status", ["validation_done", "report_generated", "quote_generated", "payment_confirmed"])
        .gte("updated_at", start)
        .lte("updated_at", end);

      const { count: quotesCreated } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .in("created_by", ids)
        .gte("created_at", start)
        .lte("created_at", end);

      const { data: confirmedQuotes } = await supabase
        .from("quotes")
        .select("total")
        .in("created_by", ids)
        .eq("status", "payment_confirmed")
        .gte("payment_50_confirmed_at", start)
        .lte("payment_50_confirmed_at", end);

      const gmv = confirmedQuotes?.reduce((sum, q) => sum + Number(q.total || 0), 0) || 0;

      const { count: submittedCount } = await supabase
        .from("quote_version_snapshots")
        .select("*", { count: "exact", head: true })
        .in("created_by", ids)
        .in("action", ["submitted_for_approval", "submitted_for_nm_approval"])
        .gte("created_at", start)
        .lte("created_at", end);

      const { count: rejectedCount } = await supabase
        .from("quote_version_snapshots")
        .select("*", { count: "exact", head: true })
        .in("created_by", ids)
        .eq("action", "rejected")
        .gte("created_at", start)
        .lte("created_at", end);

      const rejectionRate = submittedCount && submittedCount > 0 
        ? (Number(rejectedCount || 0) / submittedCount) * 100 
        : 0;

      return {
        receivedCount: received || 0,
        completedCount: completed || 0,
        quotesCreated: quotesCreated || 0,
        paymentConfirmedCount: confirmedQuotes?.length || 0,
        rejectionRate,
        reworkCount: rejectedCount || 0,
        gmv
      };
    };

    const teamMetrics = await fetchMetricsForIds(activeVlIds, monthStart, monthEnd);

    // 3. Team Breakdown (Only if viewing "All VLs")
    const teamBreakdown = [];
    if (!targetVlId) {
      for (const vlId of allVlIds) {
        const m = await fetchMetricsForIds([vlId], monthStart, monthEnd);
        teamBreakdown.push({
          vlId,
          vlName: vlInfoMap[vlId],
          ...m,
          avgQuoteValue: m.quotesCreated > 0 ? m.gmv / m.quotesCreated : 0
        });
      }
    }

    // 4. Trend Data (Last 6 Months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(selectedDate, i);
      const s = startOfMonth(d).toISOString();
      const e = endOfMonth(d).toISOString();

      const { count: valDone } = await supabase
        .from("app_validation_requests")
        .select("*", { count: "exact", head: true })
        .in("assigned_to", activeVlIds)
        .in("status", ["validation_done", "report_generated", "quote_generated", "payment_confirmed"])
        .gte("updated_at", s)
        .lte("updated_at", e);

      const { count: quoteConf } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .in("created_by", activeVlIds)
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
      metrics: teamMetrics,
      teamBreakdown,
      trend,
      vls: assignments?.map((a: any) => ({ id: a.vl_id, name: Array.isArray(a.profiles) ? a.profiles[0]?.full_name : (a.profiles as any)?.full_name })) || []
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
