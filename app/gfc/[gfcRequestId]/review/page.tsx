"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { createClient } from "@/lib/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  FileIcon, 
  Loader2, 
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function GfcReviewPage({ params }: { params: { gfcRequestId: string } }) {
  const gfcRequestId = params.gfcRequestId;
  const currentUser = useAuthStore((s) => s.currentUser);
  
  const [data, setData] = useState<any>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: gfcReq, error } = await supabase
        .from("gfc_requests")
        .select(`
          *,
          quotes (
            project_id,
            validation_requests (
              customer_name
            )
          )
        `)
        .eq("id", gfcRequestId)
        .single();

      if (!error && gfcReq) {
        setData(gfcReq);
        const { data: drws } = await supabase
          .from("gfc_drawings")
          .select("*")
          .eq("gfc_request_id", gfcRequestId);
        setDrawings(drws || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [gfcRequestId, supabase]);

  const handleAction = async (type: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      let nextStatus = data.status;
      let notificationTarget = data.assigned_da_id;
      let notificationTitle = "";
      let notificationMsg = "";

      if (type === 'approve') {
        if (currentUser?.role === 'validation_lead') {
          nextStatus = 'vl_approved';
          notificationTarget = data.assigned_by; // Notify VM
          notificationTitle = "GFC Approved by VL";
          notificationMsg = `VL has approved GFC drawings for project ${data.quotes?.project_id}. Awaiting your final approval.`;
        } else {
          nextStatus = 'published';
          notificationTarget = data.quotes?.validation_requests?.requested_by; // Notify Designer
          notificationTitle = "GFC Drawings Ready";
          notificationMsg = `GFC drawings for project ${data.quotes?.project_id} are published and ready for review.`;
        }
      } else {
        nextStatus = 'assigned'; // Send back to DA
        notificationTitle = "Changes Requested on GFC";
        notificationMsg = `${currentUser?.role === 'validation_lead' ? 'VL' : 'VM'} has requested changes on GFC for ${data.quotes?.project_id}. Feedback: ${feedback}`;
      }

      const { error } = await supabase
        .from("gfc_requests")
        .update({ 
          status: nextStatus, 
          feedback: type === 'reject' ? feedback : data.feedback 
        })
        .eq("id", gfcRequestId);

      if (error) throw error;

      // Send Notification
      await supabase.from("notifications").insert({
        user_id: notificationTarget,
        title: notificationTitle,
        message: notificationMsg,
        type: `gfc_${type}`,
        metadata: { gfcRequestId, pid: data.quotes?.project_id }
      });

      alert(`Success: GFC ${type === 'approve' ? 'approved' : 'changes requested'}.`);
      window.location.reload();

    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return <div className="p-20 text-center font-bold">Request not found.</div>;

  const isVL = currentUser?.role === 'validation_lead';
  const isVM = currentUser?.role === 'validation_manager' || currentUser?.role === 'admin';

  return (
    <div className="container py-8 max-w-3xl space-y-8">
      <div className="bg-white border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-black text-secondary tracking-tight uppercase">Review GFC Drawings</h1>
          <p className="text-sm text-slate-500 font-medium">Project: {data.quotes?.project_id} • {data.quotes?.validation_requests?.customer_name}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">DA Notes (Working Details)</p>
          <p className="text-xs text-slate-600 leading-relaxed italic">"{data.da_notes || "No notes provided"}"</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">Uploaded Files ({drawings.length})</h3>
          <div className="grid grid-cols-1 gap-3">
            {drawings.map(d => (
              <div key={d.id} className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg text-secondary">
                    <FileIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{d.file_name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{d.file_type} • {formatDateTime(d.uploaded_at).split(',')[0]}</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 uppercase tracking-widest">View</button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Zone */}
        <div className="pt-8 border-t space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
               <MessageSquare className="w-4 h-4" /> Feedback / Change logic
            </label>
            <textarea 
               value={feedback}
               onChange={e => setFeedback(e.target.value)}
               placeholder="If requesting changes, please be specific about what needs to be fixed..."
               className="mobile-input px-4 py-4 h-24 resize-none bg-slate-50 border-slate-100"
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => handleAction('reject')}
              disabled={actionLoading || !feedback.trim()}
              className="flex-1 py-4 border-2 border-slate-200 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all disabled:opacity-50"
            >
               Request Changes
            </button>
            <button 
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              className="flex-1 py-4 bg-secondary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-secondary/20 hover:bg-secondary-hover transition-all flex items-center justify-center gap-2"
            >
               {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
               {isVL ? "Approve GFC" : "Final Approve & Publish"}
            </button>
          </div>

          {isVM && data.status === 'vl_approved' && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-800">The Validation Lead has reviewed and approved these drawings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
