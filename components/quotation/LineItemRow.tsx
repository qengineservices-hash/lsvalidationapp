"use client";

import { useQuoteStore, QuoteLineItem } from "@/stores/useQuoteStore";
import { useEffect, useState, useRef } from "react";
import { Calculator, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LineItemRow({ 
  item, 
  isEditable, 
  view = "table" 
}: { 
  item: QuoteLineItem, 
  isEditable: boolean,
  view?: "table" | "card"
}) {
  const store = useQuoteStore();
  const [qty, setQty] = useState(item.quantity?.toString() || "0");
  const [remarks, setRemarks] = useState(item.remarks || "");
  const [deleting, setDeleting] = useState(false);
  
  const initialUpdateSkipped = useRef(true);

  // Debounced Auto-save
  useEffect(() => {
    if (initialUpdateSkipped.current) {
        initialUpdateSkipped.current = false;
        return;
    }

    if (!isEditable) return;

    const timeoutId = setTimeout(() => {
      const parsedQty = parseFloat(qty);
      if (!isNaN(parsedQty)) {
        store.updateLineItem(item.id, { 
          quantity: parsedQty, 
          remarks: remarks.trim() 
        });
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [qty, remarks, item.id, isEditable, store]);

  const handleDelete = async () => {
    if (confirm("Remove this item?")) {
      setDeleting(true);
      await store.deleteLineItem(item.id);
    }
  };

  if (view === "card") {
    return (
      <div className={cn(
        "p-4 space-y-3 bg-white transition-opacity",
        deleting ? 'opacity-50 pointer-events-none' : ''
      )}>
        {/* Card Header: Type & Action */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
              item.item_type === 'mrc' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'
            )}>
              {item.item_type}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">{item.service_on || '-'}</span>
          </div>
          {isEditable && (
            <button 
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-500 active:bg-red-50 rounded-lg transition-colors touch-target"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Item Content */}
        <div className="space-y-1">
          <p className="font-bold text-slate-800 text-sm leading-snug">{item.item_name}</p>
          {(item as any).sku_code && <p className="text-[10px] text-slate-400 font-mono">{(item as any).sku_code}</p>}
        </div>

        {/* Pricing & Quantity Controls */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate & Unit</span>
            <p className="text-xs font-bold text-slate-600">₹{item.unit_price.toLocaleString('en-IN')} / {item.unit}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
              {item.is_auto_calculated && <Calculator className="w-3 h-3 text-emerald-500" />}
            </div>
            {isEditable ? (
              <input 
                type="number" 
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 bg-brand-surface border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{item.quantity}</p>
            )}
          </div>
        </div>

        {/* Total Amount & Remarks */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex-1 mr-4">
             {isEditable ? (
               <input 
                 type="text" 
                 value={remarks}
                 onChange={(e) => setRemarks(e.target.value)}
                 placeholder="Add remarks..."
                 className="w-full text-xs text-slate-500 placeholder:text-slate-300 focus:text-slate-700 outline-none bg-transparent py-1 border-b border-transparent focus:border-slate-200 transition-colors"
               />
             ) : (
               <p className="text-xs text-slate-500 italic">{item.remarks || 'No remarks'}</p>
             )}
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total</span>
            <span className="text-base font-black text-slate-900">₹{Math.round((parseFloat(qty) || 0) * (item.unit_price || 0)).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className={cn(
      "border-b border-slate-100 hover:bg-secondary-light/20 transition-colors",
      deleting ? 'opacity-50 pointer-events-none' : ''
    )}>
      <td className="px-4 py-3 text-center">
        <span className={cn(
          "inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
          item.item_type === 'mrc' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'
        )}>
          {item.item_type}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.service_on || '-'}</td>
      <td className="px-4 py-3 whitespace-normal">
        <p className="font-semibold text-slate-800 leading-tight">{item.item_name}</p>
        {(item as any).sku_code && <p className="text-xs text-slate-400 mt-0.5">{(item as any).sku_code}</p>}
        {item.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
      </td>
      <td className="px-4 py-3 text-slate-600 text-xs bg-slate-50 text-center font-medium">
        {item.unit}
      </td>
      <td className="px-4 py-3 text-right">
        {isEditable ? (
          <div className="flex items-center justify-end">
            <input 
              type="number" 
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 text-right px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-primary outline-none text-sm font-semibold"
            />
            {item.is_auto_calculated && (
               <div className="group relative ml-2">
                 <Calculator className="w-4 h-4 text-emerald-500 cursor-help" />
                 <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg z-50">
                   Auto-calculated based on site measurements. You can override it.
                 </div>
               </div>
            )}
          </div>
        ) : (
          <span className="font-semibold text-slate-800">{item.quantity}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-600">
        ₹{item.unit_price.toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-3 text-right font-bold text-slate-800">
        ₹{Math.round((parseFloat(qty) || 0) * (item.unit_price || 0)).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-3 min-w-[200px]">
        {isEditable ? (
          <input 
            type="text" 
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add remarks..."
            className="w-full px-2 py-1 bg-white border border-transparent hover:border-slate-300 focus:border-primary rounded outline-none text-sm text-slate-600 transition-colors"
          />
        ) : (
          <span className="text-sm text-slate-600">{item.remarks || '-'}</span>
        )}
      </td>
      {isEditable && (
        <td className="px-4 py-3 text-center">
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      )}
    </tr>
  );
}
