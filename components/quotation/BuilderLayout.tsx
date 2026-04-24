"use client";

import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import SkuSearchDrawer from "./SkuSearchDrawer";
import { useState, useEffect } from "react";
import { RoomData } from "@/lib/mrc-calculations";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { Save, AlertCircle, Loader2, Lock, Printer } from "lucide-react";

export default function BuilderLayout({ 
  validationData,
  designerNameProp 
}: { 
  validationData: any,
  designerNameProp?: string 
}) {
  const store = useQuoteStore();
  const quote = store.currentQuote;
  
  // Drawer and Form State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);

  if (!quote) return null;

  // Fix: validationData is a ValidationRequest object, rooms are in validation_data.formData
  const validationStoreData = validationData?.validation_data || {};
  const roomOrder: string[] = validationStoreData.roomOrder || [];
  
  const allRooms = ["Full Home", ...roomOrder];
  
  const actualPid = quote.project_id === "UNKNOWN" ? validationData?.pid : quote.project_id;

  const handleOpenDrawer = (room: string) => {
    setTargetRoom(room);
    setDrawerOpen(true);
  };

  const is30PercentWarning = quote.non_mrc_percentage > 30;
  const is25PercentWarning = quote.non_mrc_percentage > 25 && !is30PercentWarning;
  const isLocked = quote.status === 'payment_confirmed' || quote.status === 'locked';

  // Cmd+K / Ctrl+K keyboard shortcut to open drawer
  useEffect(() => {
    if (isLocked) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (drawerOpen) {
          setDrawerOpen(false);
        } else {
          setTargetRoom(allRooms[0] || "Full Home");
          setDrawerOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isLocked, drawerOpen, allRooms]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Locked Banner */}
      {isLocked && (
        <div className="absolute top-0 left-0 right-0 bg-emerald-600 text-white p-3 flex items-center justify-between z-50 shadow-md">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-bold">This quote is locked — payment has been confirmed by the Designer.</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1"
            >
              <Printer className="w-3 h-3" /> Download Final Quote PDF
            </button>
            <button
              onClick={() => window.location.href = `/quotation/${quote.validation_request_id}/summary`}
              className="bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              View Summary
            </button>
          </div>
        </div>
      )}

      {/* Top Save/Status Bar (absolute overlay) */}
      {!isLocked && (
        <div className="absolute top-0 right-0 p-4 flex items-center justify-end z-50 pointer-events-none w-full">
          <div className="pointer-events-auto flex space-x-3 items-center">
            {store.loading && (
               <span className="text-xs font-medium text-slate-500 flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                 <Loader2 className="w-3 h-3 animate-spin mr-2" /> Saving...
               </span>
            )}
            {quote.status === "draft" && (
              <button 
                 onClick={() => store.submitForReview(quote.id)}
                 disabled={store.loading || store.lineItems.length === 0}
                 className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                Submit for VM Review
              </button>
            )}
            {quote.status !== "draft" && (
              <div className="bg-white border text-blue-800 border-blue-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                 Status: {quote.status.replace(/_/g, ' ').toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      <LeftPanel 
        allRooms={allRooms} 
        designerName={designerNameProp || "N/A"} 
        projectPid={actualPid} 
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Banner for high Non-MRC */}
        {is30PercentWarning && (
           <div className="bg-red-50 border-b border-red-200 p-3 flex items-center px-6 sticky top-0 z-40">
             <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
             <p className="text-sm text-red-800 font-medium">
               ⚠️ Non-MRC items exceed 30% of quote total (currently {quote.non_mrc_percentage.toFixed(1)}%). 
               VM approval is required before this quote can be sent to the Designer.
             </p>
           </div>
        )}

        <RightPanel 
          allRooms={allRooms} 
          validationData={validationData} 
          onOpenDrawer={handleOpenDrawer}
          readOnly={isLocked}
        />
      </div>

      {!isLocked && drawerOpen && targetRoom && (
        <SkuSearchDrawer 
          isOpen={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
          targetRoom={targetRoom}
          validationData={validationData}
        />
      )}
    </div>
  );
}
