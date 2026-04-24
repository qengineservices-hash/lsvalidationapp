"use client";

import { useQuoteStore } from "@/stores/useQuoteStore";

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
    <div className="w-[280px] bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 flex-shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-xl font-bold font-mono text-slate-800">{currentQuote.quote_number}</h2>
        <div className="space-y-1 mt-1">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">PID: {projectPid}</p>
          <p className="text-xs text-slate-500 font-medium">Designer: <span className="text-slate-800">{designerName}</span></p>
        </div>
        <span className="inline-flex mt-3 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
          {currentQuote.stage}
        </span>
      </div>

      {/* Room Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="text-xs font-semibold text-slate-400 mb-3 px-2 uppercase tracking-widers">Space Breakdown</p>
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
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
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

      {/* Totals Card */}
      <div className="mt-auto border-t border-slate-200 bg-slate-50 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20">
         <div className="p-4 space-y-2">
           <div className="flex justify-between text-xs font-bold">
             <span className="text-slate-500 uppercase tracking-wider">MRC Sub</span>
             <span className="text-slate-800">₹{Math.round(currentQuote.mrc_subtotal || 0).toLocaleString('en-IN')}</span>
           </div>
           <div className="flex justify-between text-xs font-bold">
             <span className="text-slate-500 uppercase tracking-wider">Non-MRC</span>
             <span className="text-slate-800">₹{Math.round(currentQuote.non_mrc_subtotal || 0).toLocaleString('en-IN')}</span>
           </div>
         </div>
         <div className="px-4 py-5 bg-blue-600 text-white flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Grand Total</span>
              <span className="text-2xl font-black tracking-tighter leading-none">₹{Math.round(currentQuote.total || 0).toLocaleString('en-IN')}</span>
            </div>
            {currentQuote.non_mrc_percentage > 25 && (
              <div className={`text-[10px] font-black px-2 py-1 rounded border-l-2 shadow-sm ${
                currentQuote.non_mrc_percentage > 30 ? 'bg-red-500/20 border-red-300' : 'bg-orange-500/20 border-orange-300'
              }`}>
                {currentQuote.non_mrc_percentage.toFixed(1)}% <span className="opacity-70">VAR</span>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
