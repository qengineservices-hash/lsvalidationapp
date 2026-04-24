"use client";

import { useEffect, useState } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import ReviewLayout from "@/components/quotation/ReviewLayout";
import { useRouter } from "next/navigation";

export default function QuoteReviewPage({ params }: { params: { requestId: string } }) {
  const { requestId } = params;
  const store = useQuoteStore();
  const supabase = createClient();
  const { currentUser: authUser } = useAuthStore();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [valData, setValData] = useState<any>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
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
        setValData(vReq.data);

        // Check if quote exists
        const { data: qData, error } = await supabase
          .from("quotes")
          .select("id, vm_id")
          .eq("validation_request_id", requestId)
          .maybeSingle();

        if (!qData) {
           throw new Error("No quotation found for this request.");
        }

        const isAdmin = role === "admin" || role === "super_admin";
        const isAssignedVm = qData.vm_id === currentUserId;

        if (!isAdmin && !isAssignedVm && role !== "validation_manager") {
           throw new Error("You do not have permission to review this quotation.");
        }

        await store.fetchQuote(qData.id);

      } catch (err: any) {
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [requestId, supabase]);

  if (loading || (!store.currentQuote && !store.error)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading Review Interface...</p>
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
            onClick={() => router.push("/manager")}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <ReviewLayout validationData={valData} />;
}
