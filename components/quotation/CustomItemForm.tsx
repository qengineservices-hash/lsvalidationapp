"use client";

import { useState } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { Loader2, X } from "lucide-react";

export default function CustomItemForm({ 
  roomName, 
  onSuccess, 
  onCancel 
}: { 
  roomName: string, 
  onSuccess: () => void, 
  onCancel: () => void 
}) {
  const store = useQuoteStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    item_name: "",
    description: "",
    unit: "",
    quantity: "",
    unit_price: "",
    remarks: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.currentQuote) return;

    setLoading(true);
    try {
      await store.addLineItem({
        quote_id: store.currentQuote.id,
        room_name: roomName,
        item_type: "non_mrc",
        item_name: formData.item_name,
        description: formData.description,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        remarks: formData.remarks,
        is_auto_calculated: false
      });
      onSuccess();
    } catch (err: any) {
      alert("Failed to add custom item: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-slate-800">Add Non-MRC Item to <span className="text-blue-600">{roomName}</span></h4>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1 md:col-span-2 text-sm">
          <p className="text-xs font-semibold text-orange-600 bg-orange-50 p-2 rounded-lg mb-2">
            Reminder: If NON-MRC exceeds 30% of Total, VM Approval is mandatory.
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Item Name *</label>
          <input 
            required 
            type="text" 
            value={formData.item_name}
            onChange={e => setFormData({...formData, item_name: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Unit *</label>
          <select 
            required 
            value={formData.unit}
            onChange={e => setFormData({...formData, unit: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">Select Unit</option>
            <option value="SqFt">SqFt</option>
            <option value="Rft">Rft</option>
            <option value="Nos">Nos</option>
            <option value="Lumpsum">Lumpsum</option>
            <option value="SqMt">SqMt</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
          <input 
            required 
            type="number" 
            step="0.01"
            value={formData.quantity}
            onChange={e => setFormData({...formData, quantity: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Rate (₹) *</label>
          <input 
            required 
            type="number" 
            step="0.01"
            value={formData.unit_price}
            onChange={e => setFormData({...formData, unit_price: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
          <textarea 
            required
            rows={2}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end space-x-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Add to Quote
        </button>
      </div>
    </form>
  );
}
