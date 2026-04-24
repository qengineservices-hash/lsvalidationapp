"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { formatDateTime } from "@/lib/formatters";
import { Loader2, Inbox, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Quote } from "@/stores/useQuoteStore";

export default function QuoteReviewsTab() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending_vm" | "pending_nm" | "approved">("pending_vm");
  const { currentUser } = useAuthStore();
  const { getUserById, cities } = useAppDataStore();
  const supabase = createClient();

  useEffect(() => {
    async function fetchQuotes() {
      // Fetch quotes along with their access record if available
      const { data, error } = await supabase
        .from("quotes")
        .select("*, designer_quote_access(access_token)")
        .in("status", ["pending_vm_review", "pending_nm_approval", "vm_approved", "sent_to_designer", "payment_confirmed"])
        .order("updated_at", { ascending: false });
        
      if (!error && data) {
        setQuotes(data);
      }
      setLoading(false);
    }
    fetchQuotes();
  }, [supabase]);

  const filteredQuotes = quotes.filter(q => {
    if (activeTab === "pending_vm") return q.status === "pending_vm_review";
    if (activeTab === "pending_nm") return q.status === "pending_nm_approval";
    if (activeTab === "approved") return ["vm_approved", "sent_to_designer", "payment_confirmed"].includes(q.status);
    return false;
  });

  const getCityName = (id: string) => cities.find(c => c.id === id)?.name || "Unknown";
  const getUserName = (id: string) => getUserById(id)?.full_name || "Unknown";

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-livspace-blue" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("pending_vm")}
          className={cn("px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all", activeTab === "pending_vm" ? "border-livspace-blue text-livspace-blue bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          Pending VM Review ({quotes.filter(q => q.status === "pending_vm_review").length})
        </button>
        <button
          onClick={() => setActiveTab("pending_nm")}
          className={cn("px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all", activeTab === "pending_nm" ? "border-orange-500 text-orange-600 bg-orange-50/50" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          Pending NM Approval ({quotes.filter(q => q.status === "pending_nm_approval").length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={cn("px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all", activeTab === "approved" ? "border-emerald-500 text-emerald-600 bg-emerald-50/50" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          Approved / Sent ({quotes.filter(q => ["vm_approved", "sent_to_designer", "payment_confirmed"].includes(q.status)).length})
        </button>
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Inbox className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">No quotes in this bucket.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map(q => {
            const isHighNm = q.non_mrc_percentage > 30;
            return (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center">
                      {q.quote_number}
                      {isHighNm && <span className="ml-3 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase tracking-wider font-bold">High Non-MRC ({q.non_mrc_percentage.toFixed(1)}%)</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">PID: {q.project_id} • {getCityName(q.city_id)}</p>
                    <div className="mt-3 text-sm text-slate-600 flex items-center space-x-4">
                      <span><span className="font-medium text-slate-800">VL:</span> {getUserName(q.created_by)}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs">Updated: {formatDateTime(q.updated_at as string)}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Grand Total</p>
                    <p className="text-xl font-black text-livspace-blue mt-0.5">₹{Math.round(q.total).toLocaleString('en-IN')}</p>
                    
                    <div className="mt-3 flex flex-col space-y-2 text-right">
                      <Link 
                        href={`/quotation/${q.validation_request_id}/review`}
                        className="inline-flex items-center text-xs font-bold text-livspace-orange hover:underline justify-end"
                      >
                        {q.status === "pending_vm_review" ? "Review & Approve" : "Review Quote"} 
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>

                      {q.designer_quote_access?.[0]?.access_token && (
                        <button 
                          onClick={() => {
                            const link = `${window.location.origin}/quote-view?token=${q.designer_quote_access[0].access_token}`;
                            navigator.clipboard.writeText(link);
                            alert("Magic Link copied to clipboard!");
                          }}
                          className="text-[10px] font-bold text-slate-400 hover:text-livspace-blue transition-colors flex items-center justify-end"
                        >
                          Copy Magic Link
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
