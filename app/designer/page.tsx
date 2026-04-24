"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import Link from "next/link";
import { PlusCircle, FileText, Receipt, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DesignerDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { getRequestsForDesigner } = useAppDataStore();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!currentUser) return;

    const requestsList = getRequestsForDesigner(currentUser.id);

    async function fetchMyQuotes() {
      // Get all validation request IDs that belong to this designer
      const myRequestIds = requestsList.map(r => r.id).filter(Boolean);

      if (myRequestIds.length === 0) {
        setLoadingQuotes(false);
        return;
      }

      const { data: quotesData, error: qErr } = await supabase
        .from("quotes")
        .select(`
          id,
          quote_number,
          project_id,
          total,
          status,
          validation_request_id,
          designer_quote_access (
            access_token,
            payment_confirmed_at,
            designer_email
          )
        `)
        .in('validation_request_id', myRequestIds);

      if (!qErr && quotesData) {
        setQuotes(quotesData);
      }
      setLoadingQuotes(false);
    }

    fetchMyQuotes();
  }, [currentUser, supabase, getRequestsForDesigner]);

  if (!currentUser) return null;

  const myRequests = getRequestsForDesigner(currentUser.id);
  
  // Create a map for StatusBuckets to show quote status on cards
  const quoteMap = quotes.reduce((acc, q) => {
    // Exact mapping by Validation Request ID
    acc[q.validation_request_id] = {
      id: q.id,
      quote_number: q.quote_number,
      status: q.status,
      ...q.designer_quote_access?.[0]
    };
    return acc;
  }, {} as any);

  // We also need a version that maps by validation_request_id for exact mapping
  // Let's update the fetch query to select validation_request_id too

  return (
    <div className="container py-8 space-y-12 max-w-4xl">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-livspace-dark">
            Hello, <span className="text-livspace-orange">{currentUser.full_name}</span>
          </h1>
          <p className="text-sm text-livspace-gray-500">
            Raise new validation requests and track their progress.
          </p>
        </div>
        <Link
          href="/validation-requests/new"
          className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-bold text-sm rounded-xl"
        >
          <PlusCircle className="w-5 h-5" />
          New Validation Request
        </Link>
      </div>

      {/* My Quotations Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
          <Receipt className="w-5 h-5 text-livspace-gray-500" />
          My Quotations
          <span className="text-sm font-normal text-livspace-gray-400">({quotes.length})</span>
        </h2>

        {loadingQuotes ? (
          <div className="h-24 bg-white rounded-2xl border border-slate-100 flex items-center justify-center">
            <Clock className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <p className="text-sm text-slate-500 font-medium whitespace-pre">
              No quotations are ready yet.{"\n"}They will appear here once the VM approves your validation requests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotes.map((q) => {
              const access = q.designer_quote_access?.[0];
              const isPaid = !!access?.payment_confirmed_at;
              return (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-livspace-blue bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {q.quote_number}
                      </span>
                      {isPaid ? (
                        <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          <CheckCircle className="w-3 h-3 mr-1" /> Paid
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          {q.status === 'sent_to_designer' ? 'Action Required' : 'In Review'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-tight">{q.project_id}</h3>
                    <p className="text-xs text-slate-500 mt-1">Total: <span className="font-bold text-slate-700">₹{Math.round(q.total).toLocaleString('en-IN')}</span></p>
                  </div>
                  
                  {access?.access_token ? (
                    <Link 
                      href={`/quote-view?token=${access.access_token}`}
                      className="mt-6 w-full py-2.5 bg-slate-50 hover:bg-livspace-dark hover:text-white border border-slate-200 rounded-xl text-xs font-bold text-livspace-dark text-center transition-all flex items-center justify-center group"
                    >
                      {isPaid ? "View Quotation" : "View & Confirm Payment"}
                      <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <div className="mt-6 w-full py-2.5 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-[10px] font-bold text-slate-400 text-center flex items-center justify-center">
                      <Clock className="w-3 h-3 mr-2" />
                      Approved. Waiting for VM to Send.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Requests Tracker */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
          <FileText className="w-5 h-5 text-livspace-gray-500" />
          Validation Tracker
          <span className="text-sm font-normal text-livspace-gray-400">({myRequests.length})</span>
        </h2>

        <StatusBuckets 
          requests={myRequests} 
          showAssignee 
          quoteMap={quoteMap}
          getActionHref={(r) => `/reports/${r.id}`}
        />
      </div>
    </div>
  );
}

