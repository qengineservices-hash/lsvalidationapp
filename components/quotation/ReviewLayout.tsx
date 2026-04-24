"use client";

import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import { useState } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { AlertCircle, Loader2, CheckCircle, XCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReviewLayout({ validationData }: { validationData: any }) {
  const store = useQuoteStore();
  const quote = store.currentQuote;
  const router = useRouter();
  const { currentUser } = useAuthStore();
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [comment, setComment] = useState("");

  if (!quote) return null;

  const validationStoreData = validationData?.validation_data || {};
  const roomOrder: string[] = validationStoreData.roomOrder || [];
  const allRooms = ["Full Home", ...roomOrder];
  
  const designerName = validationData?.customer_name_designer || "Designer Name";
  const actualPid = quote.project_id === "UNKNOWN" ? validationData?.pid : quote.project_id;

  const isHighNm = quote.non_mrc_percentage > 30;

  const handleApproveSend = async () => {
    setLoadingAction("approve_send");
    try {
      const res = await fetch(`/api/quotation/${quote.id}/send-to-designer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser?.id })
      });
      if (!res.ok) throw new Error(await res.text());
      await store.fetchQuote(quote.id);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApproveException = async () => {
    setLoadingAction("approve_exception");
    try {
      const res = await fetch(`/api/quotation/${quote.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser?.id })
      });
      if (!res.ok) throw new Error(await res.text());
      await store.fetchQuote(quote.id);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRequestChanges = async () => {
    if (!comment.trim()) {
      alert("Please enter a reason for requesting changes.");
      return;
    }
    setLoadingAction("request_changes");
    try {
      const res = await fetch(`/api/quotation/${quote.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", comment, user_id: currentUser?.id })
      });
      if (!res.ok) throw new Error(await res.text());
      setCommentModalOpen(false);
      await store.fetchQuote(quote.id);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-800">
      
      {/* Sticky Top Action Bar */}
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-50 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Quote Review: {quote.quote_number}</h1>
          <p className="text-sm text-slate-500">Status: <span className="font-semibold text-slate-800 uppercase">{quote.status.replace(/_/g, ' ')}</span></p>
        </div>

        <div className="flex space-x-3 items-center">
          {(quote.status === 'pending_vm_review' || quote.status === 'vm_approved') && (
            <>
              {(quote.status === 'vm_approved' || !isHighNm) ? (
                <button
                  onClick={handleApproveSend}
                  disabled={loadingAction !== null}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
                >
                  {loadingAction === "approve_send" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {quote.status === 'vm_approved' ? "Send to Designer" : "Approve & Send to Designer"}
                </button>
              ) : (
                <button
                  onClick={handleApproveException}
                  disabled={loadingAction !== null}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
                >
                  {loadingAction === "approve_exception" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Non-MRC Exception
                </button>
              )}
              
              <button
                onClick={() => setCommentModalOpen(true)}
                disabled={loadingAction !== null}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </button>
            </>
          )}

          {quote.status === 'pending_nm_approval' && (
            <>
              <button
                onClick={handleApproveException}
                disabled={loadingAction !== null}
                className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
              >
                {loadingAction === "approve_exception" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Approve Non-MRC Exception
              </button>
              <button
                onClick={() => setCommentModalOpen(true)}
                disabled={loadingAction !== null}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject (Ask VL to Reduce)
              </button>
            </>
          )}

          {["vm_approved", "sent_to_designer", "payment_confirmed"].includes(quote.status) && (
            <div className="text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg font-bold border border-emerald-200 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Reviewed & Distributed
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel 
          allRooms={allRooms} 
          designerName={designerName} 
          projectPid={actualPid} 
        />
        
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
          {isHighNm && (
             <div className="bg-red-50 border-b border-red-200 p-3 flex items-center px-6 sticky top-0 z-40">
               <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
               <p className="text-sm text-red-800 font-medium">
                 ⚠️ Non-MRC items exceed 30% of quote total (currently {quote.non_mrc_percentage.toFixed(1)}%). 
                 {quote.status === 'pending_vm_review' ? " Requires NM Approval exception." : ""}
               </p>
             </div>
          )}

          <RightPanel 
            allRooms={allRooms} 
            validationData={validationData} 
            onOpenDrawer={() => {}} // Disabled in review view
          />
        </div>
      </div>

      {/* Comment Modal */}
      {commentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Request Changes from VL</h3>
            <p className="text-sm text-slate-500 mb-4">Please provide detailed feedback on what needs to be changed before approval.</p>
            
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="E.g., The non-MRC carpet area calculation seems incorrect..."
              className="w-full min-h-[120px] p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              required
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCommentModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={loadingAction === "request_changes"}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center"
              >
                {loadingAction === "request_changes" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Send Feedback & Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
