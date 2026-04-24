"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Printer, ArrowLeft, CheckCircle, Clock, Send, FileText, Eye, CreditCard, Lock } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import Link from "next/link";

interface TimelineStep {
  label: string;
  timestamp: string | null;
  icon: React.ReactNode;
  color: string;
}

export default function QuoteSummaryPage({ params }: { params: { requestId: string } }) {
  const { requestId } = params;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [accessRecord, setAccessRecord] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [valData, setValData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: vReq } = await supabase
          .from("app_validation_requests")
          .select("data")
          .eq("id", requestId)
          .single();
        if (vReq) setValData(vReq.data);

        const { data: qData, error: qErr } = await supabase
          .from("quotes")
          .select("*")
          .eq("validation_request_id", requestId)
          .maybeSingle();
        if (qErr) throw qErr;
        if (!qData) throw new Error("No quotation found for this request.");
        setQuote(qData);

        const { data: items } = await supabase
          .from("quote_line_items")
          .select("*")
          .eq("quote_id", qData.id)
          .order("display_order");
        setLineItems(items || []);

        const { data: access } = await supabase
          .from("designer_quote_access")
          .select("*")
          .eq("quote_id", qData.id)
          .maybeSingle();
        setAccessRecord(access);

        const { data: snaps } = await supabase
          .from("quote_version_snapshots")
          .select("*")
          .eq("quote_id", qData.id)
          .order("version_number", { ascending: true });
        setVersions(snaps || []);

        // Activity log from API
        try {
          const actRes = await fetch(`/api/quotation/${qData.id}/activity`);
          if (actRes.ok) {
            const actData = await actRes.json();
            setActivityLog(actData.activity || []);
          }
        } catch { /* optional */ }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId, supabase]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="bg-red-50 text-red-700 p-8 rounded-xl max-w-md w-full border border-red-200">
          <h2 className="text-lg font-bold mb-2">Error</h2>
          <p>{error || "Something went wrong."}</p>
          <Link href="/validation-lead" className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const timelineSteps: TimelineStep[] = [
    { label: "Quote Created", timestamp: quote.created_at, icon: <FileText className="w-4 h-4" />, color: "bg-blue-500" },
    { label: "Submitted for Review", timestamp: quote.status !== "draft" ? quote.updated_at : null, icon: <Send className="w-4 h-4" />, color: "bg-yellow-500" },
    { label: "VM Approved", timestamp: ["vm_approved","sent_to_designer","payment_confirmed","locked"].includes(quote.status) ? quote.updated_at : null, icon: <CheckCircle className="w-4 h-4" />, color: "bg-blue-600" },
    { label: "Sent to Designer", timestamp: accessRecord?.created_at || null, icon: <Eye className="w-4 h-4" />, color: "bg-purple-500" },
    { label: "Payment Confirmed", timestamp: accessRecord?.payment_confirmed_at || null, icon: <CreditCard className="w-4 h-4" />, color: "bg-emerald-500" },
  ];

  const completedIndex = timelineSteps.reduce((max, step, i) => step.timestamp ? i : max, -1);
  const mrcTotal = lineItems.filter(i => i.item_type === "mrc").reduce((s, i) => s + Number(i.amount || 0), 0);
  const nonMrcTotal = lineItems.filter(i => i.item_type === "non_mrc").reduce((s, i) => s + Number(i.amount || 0), 0);
  const grandTotal = mrcTotal + nonMrcTotal;

  const activityTypeIcon: Record<string, string> = { creation: "🆕", snapshot: "📸", sent: "📤", accessed: "👁️", payment: "💰" };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm print:shadow-none">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/validation-lead" className="p-2 hover:bg-slate-100 rounded-lg transition-colors print:hidden">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Quote Summary</h1>
              <p className="text-sm text-slate-500">{quote.quote_number} · PID: {quote.project_id}</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="bg-livspace-dark text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-black transition-colors flex items-center gap-2 print:hidden">
            <Printer className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Quote Timeline</h2>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
            <div className="absolute top-5 left-0 h-0.5 bg-emerald-500 z-10 transition-all duration-500" style={{ width: completedIndex >= 0 ? `${(completedIndex / (timelineSteps.length - 1)) * 100}%` : "0%" }} />
            {timelineSteps.map((step, i) => {
              const isComplete = i <= completedIndex;
              return (
                <div key={step.label} className="flex flex-col items-center relative z-20 text-center" style={{ width: `${100 / timelineSteps.length}%` }}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-all ${isComplete ? step.color : "bg-slate-300"}`}>{step.icon}</div>
                  <p className={`text-[10px] font-bold mt-2 ${isComplete ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                  {step.timestamp && <p className="text-[9px] text-slate-400 mt-0.5">{formatDateTime(step.timestamp)}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">MRC Total</p>
            <p className="text-2xl font-black text-blue-600 mt-1">₹{Math.round(mrcTotal).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Non-MRC Total</p>
            <p className="text-2xl font-black text-orange-600 mt-1">₹{Math.round(nonMrcTotal).toLocaleString('en-IN')}</p>
            {grandTotal > 0 && <p className="text-xs text-slate-400 mt-1">{((nonMrcTotal / grandTotal) * 100).toFixed(1)}% of total</p>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Grand Total</p>
            <p className="text-2xl font-black text-slate-800 mt-1">₹{Math.round(grandTotal).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Designer Access Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Designer Interaction</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Magic Link Sent To</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{accessRecord?.designer_email || "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">First Accessed</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{accessRecord?.first_accessed_at ? formatDateTime(accessRecord.first_accessed_at) : "Not yet accessed"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Payment Confirmed</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{accessRecord?.payment_confirmed_at ? formatDateTime(accessRecord.payment_confirmed_at) : "Not yet"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase">Payment Confirmed By</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{accessRecord?.payment_confirmed_by_name || "—"}</p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        {activityLog.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Activity Log</h2>
            <div className="space-y-0 relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
              {activityLog.map((event, i) => (
                <div key={i} className="flex items-start gap-4 py-3 relative">
                  <div className="w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-sm z-10 shrink-0">
                    {activityTypeIcon[event.type] || "📝"}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-700">{event.action}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{event.detail}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{formatDateTime(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Line Items ({lineItems.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Room</th>
                  <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Item</th>
                  <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase text-right">Qty</th>
                  <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase text-right">Rate</th>
                  <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-xs font-medium text-slate-600">{item.room_name}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs font-bold text-slate-800">{item.item_name}</p>
                      {item.description && <p className="text-[10px] text-slate-400">{item.description}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.item_type === "mrc" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                        {item.item_type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-medium">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-2 text-xs text-right">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-xs text-right font-bold">₹{Math.round(Number(item.amount)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Version History */}
        {versions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Version History</h2>
            <div className="space-y-3">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">v{v.version_number}</div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{v.action || "Snapshot"}</p>
                      <p className="text-[10px] text-slate-400">{formatDateTime(v.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .shadow-sm, .shadow-md { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
