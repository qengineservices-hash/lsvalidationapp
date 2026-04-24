"use client";

import { useQuoteStore, QuoteLineItem } from "@/stores/useQuoteStore";
import { useEffect, useState, useRef } from "react";
import { Calculator, Trash2 } from "lucide-react";

export default function LineItemRow({ item, isEditable }: { item: QuoteLineItem, isEditable: boolean }) {
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

  return (
    <tr className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${deleting ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          item.item_type === 'mrc' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
        }`}>
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
              className="w-20 text-right px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
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
        ₹{Math.round(item.amount || 0).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-3 min-w-[200px]">
        {isEditable ? (
          <input 
            type="text" 
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add remarks..."
            className="w-full px-2 py-1 bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded outline-none text-sm text-slate-600 transition-colors"
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
