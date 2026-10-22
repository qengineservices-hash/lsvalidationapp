import React, { useState } from "react";
import { Plus, PackageOpen } from "lucide-react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import LineItemRow from "./LineItemRow";
import CustomItemForm from "./CustomItemForm";
import { getValidationRooms } from "@/lib/quotation";

const RoomSection = React.memo(({ 
  room, 
  items, 
  isEditable, 
  measurementSummary, 
  onCustomFormToggle, 
  onOpenDrawer, 
  isCustomFormOpen 
}: {
  room: string;
  items: any[];
  isEditable: boolean;
  measurementSummary: string;
  onCustomFormToggle: (room: string) => void;
  onOpenDrawer: (room: string) => void;
  isCustomFormOpen: boolean;
}) => {
  return (
    <section id={`room-section-${room}`} className="scroll-mt-16" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}>
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 border-b border-slate-200 pb-2">
        <div>
          <h3 className="text-xl font-bold text-secondary">{room}</h3>
          <p className="text-xs md:text-sm text-brand-muted font-mono mt-1 font-bold">{measurementSummary}</p>
        </div>
        
        {isEditable && (
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => onCustomFormToggle(room)}
              className="flex-1 md:flex-none text-xs md:text-sm px-4 py-2.5 text-secondary bg-white border border-secondary hover:bg-secondary-light rounded-xl font-bold transition-all touch-target"
            >
              + Non-MRC
            </button>
            <button 
              onClick={() => onOpenDrawer(room)}
              className="flex-1 md:flex-none text-xs md:text-sm flex items-center justify-center px-4 py-2.5 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold transition-all touch-target shadow-md shadow-primary/10"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add MRC
            </button>
          </div>
        )}
      </div>

      {/* Content - Responsive Table or List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                  <td colSpan={isEditable ? 9 : 8} className="px-4 py-12 text-center text-slate-400">
                    <PackageOpen className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    <p className="font-bold">No items added.</p>
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

        {/* Mobile Card-List View */}
        <div className="md:hidden divide-y divide-slate-100">
          {items.length === 0 ? (
             <div className="p-10 text-center text-slate-400 bg-slate-50/30">
               <PackageOpen className="w-10 h-10 mx-auto text-slate-200 mb-2" />
               <p className="text-xs font-bold">No items added to this space.</p>
             </div>
          ) : (
            items.map((item) => (
              <LineItemRow key={item.id} item={item} isEditable={isEditable} view="card" />
            ))
          )}
        </div>
        
        {/* Custom Item Form Dropdown */}
        {isCustomFormOpen && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <CustomItemForm 
              roomName={room} 
              onSuccess={() => onCustomFormToggle(room)} 
              onCancel={() => onCustomFormToggle(room)} 
            />
          </div>
        )}
      </div>
    </section>
  );
});

RoomSection.displayName = "RoomSection";

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
  const rooms = getValidationRooms(validationData);

  // Helper to extract adapter measurements 
  const getMeasurementSummary = (roomName: string) => {
    if (roomName === "Full Home") return "Global property level items";
    const m = rooms?.[roomName]?.measurements;
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
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 space-y-8 md:space-y-10 scroll-smooth pb-32">
      {allRooms.map((room) => (
        <RoomSection 
          key={room}
          room={room}
          items={lineItems.filter(i => i.room_name === room)}
          isEditable={isEditable}
          measurementSummary={getMeasurementSummary(room)}
          onCustomFormToggle={(r) => setOpenCustomFormRoom(openCustomFormRoom === r ? null : r)}
          onOpenDrawer={onOpenDrawer}
          isCustomFormOpen={openCustomFormRoom === room}
        />
      ))}
    </div>
  );
}
