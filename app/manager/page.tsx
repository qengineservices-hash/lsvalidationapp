"use client";

import { useAuthStore, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import Link from "next/link";
import { PlusCircle, FileText, MapPin, FileDown, LayoutGrid, Table, ArrowRight, Loader2 } from "lucide-react";
import TableView from "@/components/dashboard/TableView";
import { exportGlobalTracker } from "@/lib/exportTracker";
import { useState, useEffect, useMemo, Suspense } from "react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import QuoteReviewsTab from "@/components/dashboard/QuoteReviewsTab";
import { formatDateTime } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";
import GfcBuckets from "@/components/gfc/GfcBuckets";

function GfcManagementTab() {
  const searchParams = useSearchParams();
  const { users } = useAppDataStore();
  const [assigningId, setAssigningId] = useState<string | null>(searchParams.get("assign"));
  const [daId, setDaId] = useState("");
  const [vmNotes, setVmNotes] = useState("");
  const supabase = createClient();

  const DAs = users.filter(u => u.role === 'design_associate' && u.is_active);

  const handleAssign = async () => {
    if (!daId) return;
    const { error } = await supabase
      .from("gfc_requests")
      .update({
        assigned_da_id: daId,
        assigned_by: useAuthStore.getState().currentUser?.id,
        assigned_at: new Date().toISOString(),
        vm_notes: vmNotes,
        status: 'assigned'
      })
      .eq("id", assigningId);

    if (!error) {
       alert("DA assigned successfully.");
       window.location.href = "/manager/dashboard?tab=gfc_management";
    }
  };

  return (
    <div className="space-y-6">
      <GfcBuckets isManager />

      {/* Assignment Modal */}
      {assigningId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl scale-110">
              <h3 className="text-xl font-bold text-secondary">Assign Design Associate</h3>
              <div className="space-y-4">
                 <select 
                    value={daId} 
                    onChange={e => setDaId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none"
                 >
                    <option value="">Select DA...</option>
                    {DAs.map(da => <option key={da.id} value={da.id}>{da.full_name}</option>)}
                 </select>
                 <textarea 
                    placeholder="Notes for DA (optional)..." 
                    value={vmNotes}
                    onChange={e => setVmNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border rounded-xl text-sm h-24 resize-none"
                 />
              </div>
              <div className="flex gap-2 pt-2">
                 <button onClick={() => setAssigningId(null)} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:bg-slate-50 rounded-xl">Cancel</button>
                 <button onClick={handleAssign} className="flex-1 py-3 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20">Confirm Assignment</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function ManagerDashboardContent() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cities, validationRequests, getCitiesForUser, getVlsForVm, assignVlToRequest, getUserById } = useAppDataStore();

  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const initialTab = (searchParams.get("tab") as any) || "validations";
  const [topTab, setTopTab] = useState<"validations" | "quote_reviews" | "gfc_management">(initialTab);

  useEffect(() => {
    if (currentUser && currentUser.role !== "validation_manager" && currentUser.role !== "admin") {
      router.replace(ROLE_DASHBOARD[currentUser.role]);
    }
  }, [currentUser, router]);

  const availableVLs = getVlsForVm(currentUser?.id || "");
  const myCities = getCitiesForUser(currentUser?.id || "");
  const cityOptions = myCities.length > 0 ? myCities : cities;

  const filteredRequests = useMemo(() => {
    let base = validationRequests;
    if (currentUser?.role === "validation_manager") {
      const cityIds = myCities.map(c => c.id);
      if (cityIds.length > 0) {
        base = base.filter(r => cityIds.includes(r.city_id));
      }
    }
    if (selectedCity === "all") return base;
    return base.filter((r) => r.city_id === selectedCity);
  }, [validationRequests, currentUser?.role, myCities, selectedCity]);

  if (!currentUser || (currentUser.role !== "validation_manager" && currentUser.role !== "admin")) return null;

  return (
    <div className="container py-6 md:py-8 space-y-8 md:space-y-12 max-w-4xl">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-secondary">
            Hello, <span className="text-primary">{currentUser.full_name}</span>
          </h1>
          <p className="text-xs md:text-sm text-brand-muted">Manage validation requests, assign leads, and track progress.</p>
        </div>
        <Link href="/validation-requests/new" className="btn-primary px-6 py-3 inline-flex items-center justify-center gap-2 font-bold text-sm rounded-xl w-full sm:w-auto touch-target shadow-lg shadow-primary/20">
          <PlusCircle className="w-5 h-5" /> New Request
        </Link>
      </div>

      <div className="flex border-b border-slate-200">
        <button onClick={() => setTopTab("validations")} className={cn("flex-1 px-4 py-3 text-sm font-bold border-b-2 transition-all", topTab === "validations" ? "border-secondary text-secondary" : "border-transparent text-brand-muted")}>Site Validations</button>
        <button onClick={() => setTopTab("quote_reviews")} className={cn("flex-1 px-4 py-3 text-sm font-bold border-b-2 transition-all", topTab === "quote_reviews" ? "border-secondary text-secondary" : "border-transparent text-brand-muted")}>Quote Reviews</button>
        <button onClick={() => setTopTab("gfc_management")} className={cn("flex-1 px-4 py-3 text-sm font-bold border-b-2 transition-all", topTab === "gfc_management" ? "border-secondary text-secondary" : "border-transparent text-brand-muted")}>GFC Handover</button>
      </div>

      {topTab === "validations" ? (
        <div className="space-y-6">
          <div className="scroll-tabs">
            <button onClick={() => setSelectedCity("all")} className={cn("flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", selectedCity === "all" ? "bg-secondary text-white shadow-md shadow-secondary/10" : "bg-white text-brand-muted border border-slate-100")}>
              <MapPin className="w-3.5 h-3.5" /> All Cities
            </button>
            {cityOptions.map(city => (
              <button key={city.id} onClick={() => setSelectedCity(city.id)} className={cn("px-4 py-2.5 rounded-xl text-xs font-bold transition-all", selectedCity === city.id ? "bg-secondary text-white shadow-md shadow-secondary/10" : "bg-white text-brand-muted border border-slate-100")}>{city.name}</button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
                <FileText className="w-5 h-5 text-livspace-gray-500" /> Tracker <span className="text-sm font-normal text-livspace-gray-400">({filteredRequests.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const mappedData = filteredRequests.map(req => ({
                    city: (cities || []).find(c => c.id === req.city_id)?.name || "—",
                    pid: req.pid,
                    customer: req.customer_name,
                    status: req.status,
                    created_at: new Date(req.created_at).toLocaleDateString()
                  }));
                  exportGlobalTracker(mappedData, `Tracker_${new Date().toISOString().split('T')[0]}.csv`);
                }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all"><FileDown className="w-4 h-4" /> Download CSV</button>
              </div>
            </div>

            {viewMode === "card" ? (
              <StatusBuckets 
                requests={filteredRequests} 
                showAssignee 
                getActionHref={(r) => {
                  if (!r.assigned_to) return "";
                  const hasReport = r.status === "report_generated" || r.status === "validation_done";
                  return hasReport ? `/reports/${r.id}` : `/validation-lead/validate/${r.id}`;
                }}
                renderActions={(r) => {
                  if (r.status !== "new" && r.status !== "assigned") return null;
                  return (
                    <select
                      className="w-full text-xs border border-livspace-gray-200 rounded-lg px-2 py-2 bg-white font-bold text-secondary"
                      value={r.assigned_to || ""}
                      onChange={(e) => e.target.value && assignVlToRequest(r.id, e.target.value, currentUser.id)}
                    >
                      <option value="">— Assign VL —</option>
                      <option value={currentUser.id}>Self (Assign to Me)</option>
                      {availableVLs.filter(vl => vl.id !== currentUser.id).map(vl => (
                        <option key={vl.id} value={vl.id}>{vl.full_name}</option>
                      ))}
                    </select>
                  );
                }}
              />
            ) : (
              <TableView requests={filteredRequests} />
            )}
          </div>
        </div>
      ) : topTab === "quote_reviews" ? (
        <QuoteReviewsTab />
      ) : (
        <GfcManagementTab />
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-secondary" /></div>}>
      <ManagerDashboardContent />
    </Suspense>
  );
}
