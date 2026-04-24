"use client";

import { useEffect, useState } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, AlertTriangle, ShieldX, PackageX, ArrowLeft } from "lucide-react";
import BuilderLayout from "@/components/quotation/BuilderLayout";
import Link from "next/link";

export default function QuotationPage({ params }: { params: { requestId: string } }) {
  const { requestId } = params;
  const store = useQuoteStore();
  const supabase = createClient();
  const { currentUser: authUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [valData, setValData] = useState<any>(null);
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);
  
  // Landing Create Form State
  const [creating, setCreating] = useState(false);
  const [stage, setStage] = useState("Booking Stage");
  
  // Edge case flags
  const [notFinalised, setNotFinalised] = useState(false);
  const [noMrcForCity, setNoMrcForCity] = useState(false);
  const [cityName, setCityName] = useState("");
  const [designerName, setDesignerName] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        // Fallback to Zustand store if Supabase Auth is slow or unsynced
        let user = (await supabase.auth.getUser()).data.user;
        const currentUserId = user?.id || authUser?.id;

        if (!currentUserId) throw new Error("Please log in again to access the Quotation Engine.");

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", currentUserId).single();
        const role = profile?.role || authUser?.role;

        // Load validation request
        const { data: vReq } = await supabase
          .from("app_validation_requests")
          .select("data")
          .eq("id", requestId)
          .single();

        if (!vReq) throw new Error("Validation request not found.");
        const details = vReq.data.formData?.project || {};
        
        // Load the actual AppUser to get vm_id assigned
        const assignedVl = vReq.data.assigned_to;
        const assignedVm = vReq.data.assigned_by; // Assuming this maps to vm
        const createdBy = vReq.data.requested_by;
        
        const isAdmin = role === "admin" || role === "super_admin";
        const isVL = currentUserId === assignedVl;
        const isVM = currentUserId === assignedVm;
        const isCreator = currentUserId === createdBy;

        if (!isAdmin && !isVL && !isVM && !isCreator) {
           throw new Error("You do not have permission to view this quotation.");
        }

        setValData(vReq.data);

        // Fetch Designer Name
        if (vReq.data.requested_by) {
          const { data: designerUser } = await supabase
            .from("app_users")
            .select("full_name")
            .eq("id", vReq.data.requested_by)
            .maybeSingle();
          setDesignerName(designerUser?.full_name || "N/A");
        }

        // GUARD: Validation not finalised
        const valStatus = vReq.data.status;
        if (valStatus !== "report_generated" && valStatus !== "validation_done" && valStatus !== "quote_generated" && valStatus !== "payment_confirmed") {
          setNotFinalised(true);
          setLoading(false);
          return;
        }

        // Load city name and check MRC availability (common for both new and existing)
        const quoteCityId = vReq.data.city_id;
        if (quoteCityId) {
          const { data: cityRecord } = await supabase.from("app_cities").select("name").eq("id", quoteCityId).maybeSingle();
          setCityName(cityRecord?.name || quoteCityId);

          const { data: mrcItems } = await supabase
            .from("mrc_items")
            .select("id")
            .eq("city_id", quoteCityId)
            .eq("is_active", true)
            .limit(1);
          
          if (!mrcItems || mrcItems.length === 0) {
            setNoMrcForCity(true);
          }
        }

        // Check if quote exists
        const { data: qData } = await supabase
          .from("quotes")
          .select("id, status, created_by")
          .eq("validation_request_id", requestId)
          .maybeSingle();

        if (qData) {
          // GUARD: VL tries to access a quote they didn't create
          if (!isAdmin && !isVM && qData.created_by !== currentUserId) {
            setIsForbidden(true);
            setLoading(false);
            return;
          }

          // GUARD: Quote exists but is NOT draft → redirect to summary
          if (qData.status !== "draft") {
            window.location.href = `/quotation/${requestId}/summary`;
            return;
          }

          setExistingQuoteId(qData.id);
          await store.fetchQuote(qData.id);
        }

      } catch (err: any) {
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();

    // Cleanup: reset store when navigating away
    return () => {
      useQuoteStore.setState({ currentQuote: null, lineItems: [], loading: false, error: null });
    };
  }, [requestId, supabase]);

  const handleCreateQuote = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validation_request_id: requestId,
          project_id: valData?.pid || "UNKNOWN",
          city_id: valData?.city_id,
          stage: stage,
          vm_id: valData?.assigned_by, // link to VM from validation req
          user_id: authUser?.id
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const newQuote = await res.json();
      
      setExistingQuoteId(newQuote.id);
      await store.fetchQuote(newQuote.id);
    } catch (err: any) {
      alert("Failed to create quote: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading || (existingQuoteId && !store.currentQuote && !store.error)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading Quotation Engine...</p>
        </div>
      </div>
    );
  }

  if (authError || store.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
        <div className="bg-red-50 text-red-700 p-8 rounded-xl max-w-md w-full border border-red-200">
          <h2 className="text-lg font-bold mb-2">Notice</h2>
          <p>{authError || store.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (existingQuoteId && store.currentQuote) {
    return (
      <>
        {noMrcForCity && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span><strong>Warning:</strong> No MRC items found for {cityName}. Only Non-MRC items can be added. Contact Admin to upload the rate card.</span>
          </div>
        )}
        <BuilderLayout validationData={valData} designerNameProp={designerName} />
      </>
    );
  }

  // EDGE CASE: Validation not finalised
  if (notFinalised) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Validation Not Complete</h2>
          <p className="text-sm text-slate-500 mb-6">Site validation must be finalised before creating a quotation.</p>
          <Link
            href={`/validation-lead/validate/${requestId}`}
            className="inline-flex items-center px-6 py-3 bg-livspace-blue text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go to Validation
          </Link>
        </div>
      </div>
    );
  }

  // EDGE CASE: 403 Forbidden
  if (isForbidden) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <ShieldX className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-6">You do not have permission to access this quotation. Only the VL who created it, their VM, or an Admin can view it.</p>
          <Link href="/validation-lead" className="text-sm font-bold text-livspace-blue hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // CREATE LANDING SCREEN
  const project = {
    pid: valData?.pid || "N/A",
    customerName: valData?.customer_name || "N/A",
    city: cityName || "N/A",
    status: valData?.status || "N/A"
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 pb-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl font-bold text-slate-800">Start New Quotation</h1>
          <p className="text-slate-500 mt-1">Based on Site Validation Request</p>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-3">Project Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Project ID</p>
                <p className="font-semibold text-slate-800 uppercase tracking-tight">{project.pid}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium text-slate-800">{project.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">City</p>
                <p className="font-medium text-slate-800">{project.city}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Validation Status</p>
                <span className="inline-flex bg-green-100 text-green-700 px-2 py-0.5 rounded text-sm font-medium">
                  {project.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Project Stage</label>
            <div className="flex space-x-4">
              {['Booking Stage', 'Design Stage'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium ${
                    stage === s 
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateQuote}
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl shadow-sm transition-all flex justify-center items-center space-x-2 disabled:opacity-70"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            <span>{creating ? 'Creating Quotation...' : 'Create Quotation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
