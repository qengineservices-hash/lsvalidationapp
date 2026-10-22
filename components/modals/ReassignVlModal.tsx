"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { User, X, Loader2 } from "lucide-react";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

interface ReassignVlModalProps {
  request: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReassignVlModal({ request, onClose, onSuccess }: ReassignVlModalProps) {
  const { getUserById, getVlsForVm } = useAppDataStore();
  const { currentUser } = useAuthStore();
  const [newVlId, setNewVlId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const currentVl = request.assigned_to ? getUserById(request.assigned_to) : null;
  const availableVls = getVlsForVm(currentUser?.id || "").filter(vl => vl.id !== request.assigned_to);

  const handleSubmit = async () => {
    if (!newVlId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quotation/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          newVlId,
          reason
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert("Failed to reassign VL");
      }
    } catch (err) {
      console.error(err);
      alert("Error reassigning VL");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-secondary p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl"><User className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold">Reassign Validation Lead</h3>
              <p className="text-[10px] opacity-80 uppercase tracking-widest">Project {request.pid}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Current VL</label>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">{currentVl?.full_name?.charAt(0)}</div>
                 {currentVl?.full_name || "Unassigned"}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Select New VL</label>
              <select
                value={newVlId}
                onChange={(e) => setNewVlId(e.target.value)}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-secondary focus:ring-2 focus:ring-secondary/10 outline-none shadow-sm"
              >

              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you reassigning this project?"
                className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-secondary/10 outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newVlId || loading}
              className={cn(
                "flex-2 py-4 px-8 text-sm font-bold text-white rounded-2xl transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-2",
                !newVlId || loading ? "bg-slate-300 shadow-none cursor-not-allowed" : "bg-secondary hover:bg-secondary-hover active:scale-95"
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reassignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}
