"use client";

import { useEffect, useState, Suspense } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, AlertTriangle, ShieldAlert, Package, ArrowLeft, Home } from "lucide-react";
import BuilderLayout from "@/components/quotation/BuilderLayout";
import Link from "next/link";
import { isPendingVmApproval } from "@/lib/quotation";

function QuotationPageContent({ requestId }: { requestId: string }) {
  const store = useQuoteStore();
  const supabase = createClient();
  const { currentUser: authUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [valData, setValData] = useState<any>(null);
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);
  
  const [creating, setCreating] = useState(false);
  const [notFinalised, setNotFinalised] = useState(false);
  const [noMrcForCity, setNoMrcForCity] = useState(false);
  const [cityName, setCityName] = useState("");
  const [designerName, setDesignerName] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        console.log("[QuotationPage] Initializing for Request ID:", requestId);
        
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        const currentUserId = supabaseUser?.id || authUser?.id;

        if (!currentUserId) {
          throw new Error("Authentication required. Your session may have expired.");
        }

        // Fetch user info from app_users for the most accurate role
        const { data: appUser } = await supabase.from("app_users").select("*").eq("id", currentUserId).maybeSingle();
        const userRole = appUser?.role || authUser?.role;
        console.log("[QuotationPage] Current User:", currentUserId, "Role:", userRole);

        // Load validation request
        const { data: vReqRow, error: vReqError } = await supabase
          .from("app_validation_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (vReqError) {
          console.error("[QuotationPage] DB Error fetching request:", vReqError);
          throw new Error(`Project data could not be retrieved. (Error: ${vReqError.message})`);
        }
        
        const requestData = vReqRow?.data || {};
        setValData(requestData);

        // Permissions Check
        const isAdmin = ["admin", "super_admin"].includes(userRole || "");
        const isVM = userRole === "validation_manager";
        
        // Match IDs exactly
        const isAssignedVL = String(requestData.assigned_to) === String(currentUserId);
        const isAssignedVM = String(requestData.assigned_by) === String(currentUserId);
        const isRequestingDesigner = String(requestData.requested_by) === String(currentUserId);

        console.log("[QuotationPage] Permission Flags:", {
          isAdmin,
          isVM,
          isAssignedVL,
          isAssignedVM,
          isRequestingDesigner,
          data_assigned_to: requestData.assigned_to,
          data_requested_by: requestData.requested_by,
          current_uid: currentUserId
        });

        // Check if project exists but is not finalized
        const valStatus = requestData.status;
        const completedStatuses = ["report_generated", "validation_done", "quote_generated", "payment_confirmed", "gfc_requested", "published"];
        
        if (!isAdmin && !isVM && !isAssignedVL && !isAssignedVM && !isRequestingDesigner) {
           console.warn("[QuotationPage] Access Denied for user", currentUserId);
           setIsForbidden(true);
           setLoading(false);
           return;
        }

        if (requestData.requested_by) {
          const { data: designerUser } = await supabase
            .from("app_users")
            .select("full_name")
            .eq("id", requestData.requested_by)
            .maybeSingle();
          setDesignerName(designerUser?.full_name || "N/A");
        }

        if (!completedStatuses.includes(valStatus)) {
          setNotFinalised(true);
          setLoading(false);
          return;
        }

        const cityId = requestData.city_id;
        if (cityId) {
          const { data: cityRec } = await supabase.from("app_cities").select("name").eq("id", cityId).maybeSingle();
          setCityName(cityRec?.name || "Selected City");

          const { data: mrcExists } = await supabase.from("mrc_items").select("id").eq("city_id", cityId).eq("is_active", true).limit(1);
          if (!mrcExists || mrcExists.length === 0) setNoMrcForCity(true);
        }

        // Check for existing quote
        const { data: quoteRec } = await supabase
          .from("quotes")
          .select("id, status, created_by")
          .eq("validation_request_id", requestId)
          .maybeSingle();

        if (quoteRec) {
          console.log("[QuotationPage] Existing Quote:", quoteRec.id, "Status:", quoteRec.status);
          const editableStatuses = ["draft", "pending_vm_review", "pending_vm_approval", "pending_nm_approval", "vm_approved", "sent_to_designer", "payment_confirmed"];
          if (!editableStatuses.includes(quoteRec.status)) {
            window.location.href = `/quotation/${requestId}/summary`;
            return;
          }

          setExistingQuoteId(quoteRec.id);
          await store.fetchQuote(quoteRec.id);
        }

      } catch (err: any) {
        console.error("[QuotationPage] Initialization Failed:", err);
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();

    return () => {
      useQuoteStore.setState({ currentQuote: null, lineItems: [], loading: false, error: null });
    };
  }, [requestId, supabase, authUser]);

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
          vm_id: valData?.assigned_by,
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
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Initializing Quotation Engine...</p>
        </div>
      </div>
    );
  }

  if (authError || store.error) {
    return (
      <div className="flex h-screen items-center justify-center p-6 bg-slate-50">
        <div className="bg-red-50 text-red-700 p-8 rounded-3xl max-w-md w-full border border-red-200 text-center shadow-xl">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-bold mb-2">Notice</h2>
          <p className="text-sm leading-relaxed">{authError || store.error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-2xl p-10 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-secondary mb-3">Access Denied</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">You do not have permission to access this project. If you are the assigned designer or lead, please contact your manager.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3.5 bg-secondary text-white rounded-2xl font-bold shadow-lg shadow-secondary/20 hover:bg-secondary-hover transition-all">
            <Home className="w-4 h-4" /> Back to Dashboard
          </Link>
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
            <span><strong>Warning:</strong> No MRC items found for {cityName}. Contact Admin.</span>
          </div>
        )}
        <BuilderLayout validationData={valData} designerNameProp={designerName} />
      </>
    );
  }

  if (notFinalised) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-secondary mb-3">Validation Not Ready</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">The site validation must be finalised by the lead before you can start the quotation process.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-10 pb-8 bg-slate-50/50 border-b border-slate-100">
          <h1 className="text-3xl font-black text-secondary">Start Quotation</h1>
          <p className="text-slate-500 mt-2">Initialize the estimation process for this project.</p>
        </div>
        <div className="p-10 space-y-10">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Project ID</p>
              <p className="text-lg font-bold text-secondary uppercase">{valData?.pid}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer</p>
              <p className="text-lg font-bold text-secondary">{valData?.customer_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">City</p>
              <p className="text-lg font-bold text-secondary">{cityName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Designer</p>
              <p className="text-lg font-bold text-secondary">{designerName}</p>
            </div>
          </div>
          <button
            onClick={handleCreateQuote}
            disabled={creating}
            className="w-full bg-secondary text-white font-black py-5 rounded-2xl shadow-xl shadow-secondary/20 hover:bg-secondary-hover transition-all flex justify-center items-center gap-3 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
            {creating ? 'CREATING...' : 'CREATE QUOTATION'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuotationPage({ params }: { params: { requestId: string } }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-secondary" /></div>}>
      <QuotationPageContent requestId={params.requestId} />
    </Suspense>
  );
}
