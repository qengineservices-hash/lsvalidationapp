"use client";

import { useQuoteStore } from "@/stores/useQuoteStore";
import { Plus, HelpCircle, PackageOpen } from "lucide-react";
import LineItemRow from "./LineItemRow";
import CustomItemForm from "./CustomItemForm";
import { useState } from "react";

export default function RightPanel({ 
  allRooms, 
  validationData,
  onOpenDrawer,
  readOnly = false
}: { 
  allRooms: string[], 
  validationData: any,
  onOpenDrawer: (room: string) => void,
  readOnly?: boolean
}) {
  const { currentQuote, lineItems } = useQuoteStore();
  const [openCustomFormRoom, setOpenCustomFormRoom] = useState<string | null>(null);

  if (!currentQuote) return null;

  const isEditable = !readOnly && currentQuote.status === "draft";

  // Helper to extract adapter measurements 
  const getMeasurementSummary = (roomName: string) => {
    if (roomName === "Full Home") return "Global property level items";
    const m = validationData?.formData?.rooms?.[roomName]?.measurements;
    if (!m) return "No measurements recorded";
    
    // Using adapter logic: reading L, W, H if present
    const l = m.roomLength || 0;
    const w = m.roomWidth || 0;
    const h = m.ceilingHeight || 0;
    
    if (l || w || h) {
      return `L: ${l}ft × W: ${w}ft × H: ${h}ft`;
    }
    return "No L×W×H dimensions recorded";
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-10 scroll-smooth pb-32">
      {allRooms.map((room) => {
        const items = lineItems.filter(i => i.room_name === room);
        
        return (
          <section key={room} id={`room-section-${room}`} className="scroll-mt-16">
            {/* Section Header */}
            <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{room}</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">{getMeasurementSummary(room)}</p>
              </div>
              
              {isEditable && (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setOpenCustomFormRoom(room === openCustomFormRoom ? null : room)}
                    className="text-sm px-3 py-1.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-lg font-medium transition-colors"
                  >
                    Add Non-MRC
                  </button>
                  <button 
                    onClick={() => onOpenDrawer(room)}
                    className="text-sm flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add MRC Item
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center">Type</th>
                      <th className="px-4 py-3 w-32">Service On</th>
                      <th className="px-4 py-3 min-w-[200px] max-w-[300px]">Item Description</th>
                      <th className="px-4 py-3 w-20">Unit</th>
                      <th className="px-4 py-3 w-24 text-right">Quantity</th>
                      <th className="px-4 py-3 w-24 text-right">Rate</th>
                      <th className="px-4 py-3 w-32 text-right">Amount</th>
                      <th className="px-4 py-3 min-w-[150px]">Remarks</th>
                      {isEditable && <th className="px-4 py-3 w-12 text-center">Act</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={isEditable ? 9 : 8} className="px-4 py-8 text-center text-slate-400">
                          <PackageOpen className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                          <p>No items added for this space.</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <LineItemRow key={item.id} item={item} isEditable={isEditable} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Custom Item Form Dropdown */}
              {openCustomFormRoom === room && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  <CustomItemForm 
                    roomName={room} 
                    onSuccess={() => setOpenCustomFormRoom(null)} 
                    onCancel={() => setOpenCustomFormRoom(null)} 
                  />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
