"use client";

import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import SkuSearchDrawer from "./SkuSearchDrawer";
import QuoteActionBar from "./QuoteActionBar";
import { useState, useEffect } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { AlertCircle, Lock, Printer, LayoutGrid, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { getValidationRoomOrder } from "@/lib/quotation";

export default function BuilderLayout({ 
  validationData,
  designerNameProp 
}: { 
  validationData: any,
  designerNameProp?: string 
}) {
  const store = useQuoteStore();
  const quote = store.currentQuote;
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"items" | "summary">("items");

  if (!quote) return null;

  // Fix: validationData is a ValidationRequest object, rooms are in validation_data.formData
  const roomOrder = getValidationRoomOrder(validationData);
  
  const allRooms = ["Full Home", ...roomOrder];
  
  const actualPid = quote.project_id === "UNKNOWN" ? validationData?.pid : quote.project_id;

  const handleOpenDrawer = (room: string) => {
    setTargetRoom(room);
    setDrawerOpen(true);
  };

  const is30PercentWarning = quote.non_mrc_percentage > 30;
  const isReadOnly = quote.status === 'payment_confirmed' || quote.status === 'locked';
  const isLocked = quote.status === 'locked';

  // Cmd+K / Ctrl+K keyboard shortcut to open drawer
  useEffect(() => {
    if (isReadOnly) return;
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
  }, [isReadOnly, drawerOpen, allRooms]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-brand-surface text-brand-dark pb-bottom-nav md:pb-0 relative">
      {/* Locked Banner - Responsive */}
      {isLocked && (
        <div className="absolute top-0 left-0 right-0 bg-emerald-600 text-white p-2.5 md:p-3 flex flex-col md:flex-row items-center justify-between z-50 shadow-md gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="text-xs md:text-sm font-bold">This quote is locked.</span>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 md:flex-none justify-center bg-white text-emerald-700 text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-1.5 touch-target"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={() => window.location.href = `/quotation/${quote.validation_request_id}/summary`}
              className="flex-1 md:flex-none justify-center bg-emerald-700 text-white text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-800 transition-colors touch-target"
            >
              Summary
            </button>
          </div>
        </div>
      )}

      {!isLocked && <QuoteActionBar />}


      <div className={cn(
        "flex-1 md:flex-none md:w-80 lg:w-96 md:block",
        mobileTab === "summary" ? "block" : "hidden"
      )}>
        <LeftPanel 
          allRooms={allRooms} 
          designerName={designerNameProp || "N/A"} 
          projectPid={actualPid} 
        />
      </div>
      
      <div className={cn(
        "flex-1 flex flex-col relative overflow-hidden",
        mobileTab === "items" ? "flex" : "hidden md:flex"
      )}>
        {/* Banner for high Non-MRC */}
        {is30PercentWarning && (
           <div className="bg-red-50 border-b border-red-200 p-2.5 flex items-start px-4 md:px-6 sticky top-0 z-40">
             <AlertCircle className="w-4 h-4 text-red-500 mr-2 shrink-0 mt-0.5" />
             <p className="text-[10px] md:text-sm text-red-800 font-bold leading-tight">
               Non-MRC &gt; 30% ({quote.non_mrc_percentage.toFixed(1)}%). 
               VM approval required.
             </p>
           </div>
        )}

        <RightPanel 
          allRooms={allRooms} 
          validationData={validationData} 
          onOpenDrawer={handleOpenDrawer}
          readOnly={isReadOnly}
        />
      </div>

      {!isReadOnly && drawerOpen && targetRoom && (
        <SkuSearchDrawer 
          isOpen={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
          targetRoom={targetRoom}
          validationData={validationData}
        />
      )}

      {/* Mobile-only Bottom Tab Switcher */}
      <div className="bottom-nav bg-secondary md:hidden" role="navigation">
         <button
            onClick={() => setMobileTab("items")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-4 transition-colors",
              mobileTab === "items" ? "text-accent" : "text-white/60"
            )}
         >
            <div className={cn(mobileTab === "items" && "[&>svg]:fill-accent")}>
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Items</span>
            {mobileTab === "items" && <span className="absolute top-0 w-8 h-0.5 bg-accent rounded-full" />}
         </button>
         <button
            onClick={() => setMobileTab("summary")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
              mobileTab === "summary" ? "text-accent" : "text-white/60"
            )}
         >
            <div className={cn(
              "relative",
              mobileTab === "summary" && "[&>svg]:fill-accent"
            )}>
               <Receipt className="w-5 h-5" />
               <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 bg-accent rounded-full border border-secondary" />
            </div>
            <span className="text-[10px] font-medium">Summary</span>
            {mobileTab === "summary" && <span className="absolute top-0 w-8 h-0.5 bg-accent rounded-full" />}
         </button>
      </div>
    </div>
  );
}
