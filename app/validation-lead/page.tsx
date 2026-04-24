"use client";

import { useAuthStore, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import { ClipboardCheck, LayoutGrid, Table, FileDown } from "lucide-react";
import TableView from "@/components/dashboard/TableView";
import { exportGlobalTracker } from "@/lib/exportTracker";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useQuoteStatusUpdates } from "@/hooks/useQuoteStatusUpdates";
import { X } from "lucide-react";

export default function ValidationLeadDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const { getRequestsForVl, updateRequestStatus } = useAppDataStore();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [quotesMap, setQuotesMap] = useState<Record<string, any>>({});
  const supabase = createClient();

  const myAssignedRequests = getRequestsForVl(currentUser?.id || "");

  // Realtime updates hook
  const fetchQuotes = useCallback(async () => {
    if (!currentUser || myAssignedRequests.length === 0) return;

    // We can fetch quotes for our PIDs or purely by the validation_request_id.
    // It's safest to match validation_request_id strictly since quotes are tied to them.
    const requestIds = myAssignedRequests.map(r => r.id);
    
    // We chunk if it's too large, but for MVP just fetch
    const { data: quotesData, error } = await supabase
      .from("quotes")
      .select(`
        id,
        quote_number,
        validation_request_id,
        status,
        designer_quote_access (
          access_token,
          sent_to_designer_at:created_at,
          first_accessed_at,
          payment_confirmed_at
        )
      `)
      .in('validation_request_id', requestIds);

    if (!error && quotesData) {
      const qMap: Record<string, any> = {};
      quotesData.forEach(q => {
        if (q.validation_request_id) {
          const access = q.designer_quote_access?.[0];
          qMap[q.validation_request_id] = {
            id: q.id,
            quote_number: q.quote_number,
            status: q.status,
            sent_to_designer_at: access?.sent_to_designer_at || null,
            first_accessed_at: access?.first_accessed_at || null,
            payment_confirmed_at: access?.payment_confirmed_at || null
          };
        }
      });
      setQuotesMap(qMap);
    }
  }, [currentUser, myAssignedRequests, supabase]);

  const { toastMessage, clearToast } = useQuoteStatusUpdates(currentUser?.id, fetchQuotes);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Safety: If Admin/Manager accidentally lands here, bounce them to their correct home
  useEffect(() => {
    if (currentUser && currentUser.role !== "validation_lead") {
      router.replace(ROLE_DASHBOARD[currentUser.role]);
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "validation_lead") return null;

  return (
    <div className="container py-8 space-y-8 max-w-4xl relative">
      {/* Realtime Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-start gap-3 max-w-md animate-in slide-in-from-top-4">
          <p className="text-sm font-bold flex-1">{toastMessage}</p>
          <button onClick={clearToast} className="p-1 hover:bg-emerald-700 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-livspace-dark">
          Hello, <span className="text-livspace-orange">{currentUser.full_name}</span>
        </h1>
        <p className="text-sm text-livspace-gray-500">
          Your assigned site validations. Tap a request to begin or continue validation.
        </p>
      </div>

      {/* Assigned Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-livspace-gray-500" />
            My Validations
            <span className="text-sm font-normal text-livspace-gray-400">
              ({myAssignedRequests.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-livspace-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("card")}
                className={cn("p-1.5 rounded text-xs transition-colors", viewMode === "card" ? "bg-white shadow-sm text-livspace-dark" : "text-livspace-gray-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-1.5 rounded text-xs transition-colors", viewMode === "table" ? "bg-white shadow-sm text-livspace-dark" : "text-livspace-gray-400")}
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => {
                const mappedData = myAssignedRequests.map(req => ({
                  city: (useAppDataStore.getState().cities || []).find(c => c.id === req.city_id)?.name || "—",
                  pid: req.pid,
                  request_id: req.request_number || req.id,
                  customer: req.customer_name,
                  designer: useAppDataStore.getState().getUserById(req.requested_by)?.full_name || "—",
                  manager: req.assigned_by ? useAppDataStore.getState().getUserById(req.assigned_by)?.full_name || "—" : "—",
                  lead: req.assigned_to ? useAppDataStore.getState().getUserById(req.assigned_to)?.full_name || "—" : "—",
                  created_at: new Date(req.created_at).toLocaleDateString(),
                  scheduled: req.scheduled_date ? `${req.scheduled_date} ${req.scheduled_time || ""}` : "—",
                  status: req.status === "report_generated" ? "Report Generated" : req.status === "validation_done" ? "Validation Completed" : "In Progress",
                  version: req.version || 1,
                  last_edited: req.last_edited_at ? new Date(req.last_edited_at).toLocaleDateString() : "—",
                  report_link: req.status === "report_generated" ? `${window.location.origin}/reports/${req.id}` : "—"
                }));
                exportGlobalTracker(mappedData, `VL_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>

        {viewMode === "card" ? (
          <StatusBuckets
            requests={myAssignedRequests}
            overrideBuckets={[
              { key: "assigned", label: "New", emoji: "🆕" },
              { key: "in_progress", label: "Ongoing", emoji: "🔄" },
              { key: "on_hold", label: "On Hold", emoji: "⏸️" },
              { key: "report_generated", label: "Completed", emoji: "✅", statuses: ["validation_done", "report_generated"] },
            ]}
            quoteMap={quotesMap}
            getActionHref={(req) => req.status === "assigned" ? undefined : `/validation-lead/validate/${req.id}`}
            renderActions={(req) => {
              if (req.status === "assigned" && !req.accepted_at) {
                return (
                  <button 
                    onClick={() => updateRequestStatus(req.id, "assigned", { accepted_at: new Date().toISOString() })}
                    className="w-full bg-livspace-blue text-white py-2.5 text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Accept Validation
                  </button>
                );
              }
              if (req.status === "assigned" || req.status === "in_progress" || req.status === "on_hold") {
                return (
                  <button 
                    onClick={() => router.push(`/validation-lead/validate/${req.id}`)}
                    className="w-full bg-livspace-orange text-white py-2.5 text-xs font-bold rounded-lg hover:bg-livspace-orange/90 transition-colors"
                  >
                    {req.status === "in_progress" ? "Continue Validation" : "Go to Validation"}
                  </button>
                );
              }
              return null;
            }}
          />
        ) : (
          <TableView requests={myAssignedRequests} />
        )}
      </div>
    </div>
  );
}
