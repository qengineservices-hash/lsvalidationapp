"use client";

import { useQuoteStore } from "@/stores/useQuoteStore";
import { cn } from "@/lib/utils";

export default function LeftPanel({ 
  allRooms, 
  designerName, 
  projectPid 
}: { 
  allRooms: string[], 
  designerName: string, 
  projectPid: string 
}) {
  const { currentQuote, lineItems } = useQuoteStore();

  if (!currentQuote) return null;

  const scrollToRoom = (room: string) => {
    const el = document.getElementById(`room-section-${room}`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const getRoomCount = (room: string) => lineItems.filter(i => i.room_name === room).length;
  const getRoomAmount = (room: string) => 
    lineItems.filter(i => i.room_name === room).reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="w-full md:w-[280px] lg:w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 flex-shrink-0 h-full">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100 bg-brand-surface">
        <h2 className="text-lg md:text-xl font-bold font-mono text-secondary">{currentQuote.quote_number}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide font-bold">PID: {projectPid}</p>
          <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-tight">Designer: <span className="text-slate-800">{designerName}</span></p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-surface text-brand-muted border border-slate-100 uppercase tracking-wider">
            {currentQuote.status}
          </span>
        </div>
      </div>

      {/* Room Navigation - Scrollable on mobile, list on desktop */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-[10px] font-black text-slate-400 mb-3 px-2 uppercase tracking-[0.15em]">Space Breakdown</p>
        <div className="space-y-1">
        {allRooms.map(room => {
          const count = getRoomCount(room);
          const amt = getRoomAmount(room);
          return (
            <button 
              key={room}
              onClick={() => scrollToRoom(room)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group flex flex-col border border-transparent hover:border-slate-100"
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-medium text-slate-700 truncate">{room}</span>
                {count > 0 && (
                  <span className="text-[10px] font-bold bg-secondary-light text-secondary px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {count}
                  </span>
                )}
              </div>
              {amt > 0 && (
                <span className="text-xs text-slate-500 mt-0.5 font-medium">₹{Math.round(amt).toLocaleString('en-IN')}</span>
              )}
            </button>
          )
        })}
        </div>
      </div>

      {/* Totals Card */}
      <div className="mt-auto border-t border-slate-200 bg-brand-surface shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20">
         <div className="p-4 space-y-2">
           <div className="flex justify-between text-xs font-bold">
             <span className="text-secondary-muted uppercase tracking-wider uppercase opacity-60">MRC Sub</span>
             <span className="text-secondary font-bold">₹{Math.round(currentQuote.mrc_subtotal || 0).toLocaleString('en-IN')}</span>
           </div>
           <div className="flex justify-between text-xs font-bold">
             <span className="text-secondary-muted uppercase tracking-wider uppercase opacity-60">Non-MRC</span>
             <span className="text-secondary font-bold">₹{Math.round(currentQuote.non_mrc_subtotal || 0).toLocaleString('en-IN')}</span>
           </div>
         </div>
         <div className="px-4 py-5 bg-secondary text-white flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Grand Total</span>
              <span className="text-2xl font-black tracking-tighter leading-none">₹{Math.round(currentQuote.total || 0).toLocaleString('en-IN')}</span>
            </div>
            {currentQuote.non_mrc_percentage > 25 && (
              <div className={`text-[10px] font-black px-2 py-1 rounded border-l-2 shadow-sm ${
                currentQuote.non_mrc_percentage > 30 ? 'bg-primary/20 border-primary' : 'bg-accent/20 border-accent'
              }`}>
                {currentQuote.non_mrc_percentage.toFixed(1)}% <span className="opacity-70 text-accent">VAR</span>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
