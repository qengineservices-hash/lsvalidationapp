"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Save, Loader2 } from "lucide-react";

type MRCItemDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  subCategories: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  editingItem: any | null;
  onSuccess: () => void;
};

const UNITS = ["SqFt", "Nos", "RFt", "RMt", "Trip", "Package", "Lumpsum"];
const SERVICES_ON = ["Ceiling", "Walls", "Floor", "Wall-N", "Wall-S", "Full Home"];

export default function MRCItemDrawer({
  isOpen,
  onClose,
  categoryId,
  subCategories,
  cities,
  editingItem,
  onSuccess,
}: MRCItemDrawerProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    sku_code: "",
    sku_name: "",
    sub_category_id: "",
    city_id: "",
    description: "",
    brand_specification: "",
    unit: "SqFt",
    service_on: "",
    rate: "",
    effective_from: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          sku_code: editingItem.sku_code || "",
          sku_name: editingItem.sku_name || "",
          sub_category_id: editingItem.sub_category_id || "",
          city_id: editingItem.city_id || "",
          description: editingItem.description || "",
          brand_specification: editingItem.brand_specification || "",
          unit: editingItem.unit || "SqFt",
          service_on: editingItem.service_on || "",
          rate: editingItem.rate ? editingItem.rate.toString() : "",
          effective_from: editingItem.effective_from || new Date().toISOString().split("T")[0],
          is_active: editingItem.is_active ?? true,
        });
      } else {
        setFormData({
          sku_code: "",
          sku_name: "",
          sub_category_id: subCategories.length > 0 ? subCategories[0].id : "",
          city_id: cities.length > 0 ? cities[0].id : "",
          description: "",
          brand_specification: "",
          unit: "SqFt",
          service_on: "",
          rate: "",
          effective_from: new Date().toISOString().split("T")[0],
          is_active: true,
        });
      }
    }
  }, [isOpen, editingItem, subCategories, cities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        category_id: categoryId,
        sku_code: formData.sku_code,
        sku_name: formData.sku_name,
        sub_category_id: formData.sub_category_id,
        city_id: formData.city_id || null,
        description: formData.description,
        brand_specification: formData.brand_specification,
        unit: formData.unit,
        service_on: formData.service_on || null, // null if empty string
        rate: parseFloat(formData.rate) || 0,
        effective_from: formData.effective_from,
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("mrc_items")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mrc_items")
          .insert(payload);
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Error saving SKU: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {editingItem ? "Edit SKU" : "Add New SKU"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {editingItem ? 'Update existing item details.' : 'Create a new line item for quotations.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={formData.sku_code}
                onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 1CIUR8LI1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City (Optional)</label>
              <select
                value={formData.city_id}
                onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">— All Cities —</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Leave as "All Cities" for global SKUs.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SKU Name *</label>
            <input
              type="text"
              required
              value={formData.sku_name}
              onChange={(e) => setFormData({ ...formData, sku_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Standard Gypsum False Ceiling"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Category *</label>
              <select
                required
                value={formData.sub_category_id}
                onChange={(e) => setFormData({ ...formData, sub_category_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>Select Sub-category</option>
                {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Service On</label>
               <select
                 value={formData.service_on}
                 onChange={(e) => setFormData({ ...formData, service_on: e.target.value })}
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               >
                 <option value="">None / Applicable everywhere</option>
                 {SERVICES_ON.map(so => <option key={so} value={so}>{so}</option>)}
               </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate (INR) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Brand/Specification</label>
            <input
              type="text"
              value={formData.brand_specification}
              onChange={(e) => setFormData({ ...formData, brand_specification: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Saint Gobain / Asian Paints"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
             <textarea
               rows={3}
               value={formData.description}
               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
               placeholder="Detailed item description..."
             />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Effective From</label>
               <input
                 type="date"
                 value={formData.effective_from}
                 onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
             
             <div className="flex items-center space-x-3 pt-6">
               <label className="text-sm font-medium text-slate-700">Is Active</label>
               <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
               >
                 <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
               </button>
             </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save SKU'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
