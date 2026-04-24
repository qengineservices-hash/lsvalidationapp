"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FileText, ArrowRight, Filter } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "draft" | "in_review" | "sent" | "payment_confirmed";

const FILTER_TABS: { key: FilterTab; label: string; statuses: string[] }[] = [
  { key: "all", label: "All", statuses: [] },
  { key: "draft", label: "Draft", statuses: ["draft"] },
  { key: "in_review", label: "In Review", statuses: ["pending_vm_review", "pending_nm_approval", "vm_approved"] },
  { key: "sent", label: "Sent", statuses: ["sent_to_designer"] },
  { key: "payment_confirmed", label: "Payment Confirmed", statuses: ["payment_confirmed", "locked"] },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-600" },
  pending_vm_review: { label: "Awaiting VM", bg: "bg-yellow-100", text: "text-yellow-700" },
  pending_nm_approval: { label: "NM Approval", bg: "bg-orange-100", text: "text-orange-700" },
  vm_approved: { label: "VM Approved", bg: "bg-blue-100", text: "text-blue-700" },
  sent_to_designer: { label: "Sent to Designer", bg: "bg-purple-100", text: "text-purple-700" },
  payment_confirmed: { label: "Payment Confirmed", bg: "bg-green-100", text: "text-green-700" },
  locked: { label: "Locked", bg: "bg-emerald-100", text: "text-emerald-700" },
};

export default function MyQuotationsPage() {
  const { currentUser } = useAuthStore();
  const supabase = createClient();
  
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  useEffect(() => {
    if (!currentUser) return;

    async function fetchAll() {
      const { data, error } = await supabase
        .from("quotes")
        .select(`
          id,
          quote_number,
          project_id,
          validation_request_id,
          status,
          total,
          created_at,
          updated_at,
          validation_request:app_validation_requests!inner ( data )
        `)
        .eq("created_by", currentUser.id)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setQuotes(data);
      }
      setLoading(false);
    }
    fetchAll();
  }, [currentUser, supabase]);

  if (!currentUser) return null;

  const filtered = activeFilter === "all"
    ? quotes
    : quotes.filter(q => FILTER_TABS.find(t => t.key === activeFilter)?.statuses.includes(q.status));

  return (
    <div className="container py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-slate-400" />
            My Quotations
          </h1>
          <p className="text-sm text-slate-500 mt-1">All quotations you have created.</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => {
          const count = tab.key === "all"
            ? quotes.length
            : quotes.filter(q => tab.statuses.includes(q.status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                activeFilter === tab.key
                  ? "bg-livspace-blue text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-livspace-blue"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                  activeFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No quotations found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Quote No</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">PID</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Updated</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(q => {
                  const badge = STATUS_BADGE[q.status] || { label: q.status, bg: "bg-slate-100", text: "text-slate-600" };
                  const customerName = q.validation_request?.data?.customer_name || "—";
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-700">{q.quote_number}</td>
                      <td className="px-4 py-3 font-medium text-slate-600 uppercase">{q.project_id}</td>
                      <td className="px-4 py-3 text-slate-600">{customerName}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", badge.bg, badge.text)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">₹{Math.round(q.total || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(q.created_at).split(',')[0]}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(q.updated_at).split(',')[0]}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/quotation/${q.validation_request_id}`}
                          className="p-2 text-slate-400 hover:text-livspace-blue transition-colors rounded-lg hover:bg-blue-50"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
