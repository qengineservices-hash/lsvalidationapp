"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Plus, Edit2, CheckCircle2, XCircle, ChevronRight, 
  Layers, Package, MapPin, Activity, Loader2, Save, X
} from "lucide-react";

type CategoryData = {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  sub_categories_count: number;
  items_count: number;
};

export default function MRCDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState({ totalCategories: 0, totalSkus: 0, activeCities: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [formData, setFormData] = useState({ name: "", display_order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch categories
      const { data: catsData, error: catsErr } = await supabase
        .from("mrc_categories")
        .select("id, name, display_order, is_active")
        .order("display_order", { ascending: true });

      if (catsErr) throw catsErr;

      // Fetch sub-categories to just get counts
      const { data: subsData, error: subsErr } = await supabase
        .from("mrc_sub_categories")
        .select("id, category_id");
      if (subsErr) throw subsErr;

      // Fetch items to get counts and cities
      const { data: itemsData, error: itemsErr } = await supabase
        .from("mrc_items")
        .select("id, category_id, city_id, is_active");
      if (itemsErr) throw itemsErr;

      // Calculate stats
      const distinctCities = new Set(
        itemsData?.filter(i => i.is_active && i.city_id).map(i => i.city_id)
      );

      setStats({
        totalCategories: catsData?.length || 0,
        totalSkus: itemsData?.length || 0,
        activeCities: distinctCities.size
      });

      // Map counts
      const mappedCats: CategoryData[] = (catsData || []).map(c => ({
        ...c,
        sub_categories_count: subsData?.filter(s => s.category_id === c.id).length || 0,
        items_count: itemsData?.filter(i => i.category_id === c.id).length || 0
      }));

      setCategories(mappedCats);
    } catch (err: any) {
      console.error("Error fetching MRC data:", err);
      setError(err.message || "An unknown error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", display_order: (categories[categories.length - 1]?.display_order || 0) + 10 });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryData) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, display_order: cat.display_order });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from("mrc_categories")
          .update({ name: formData.name, display_order: formData.display_order })
          .eq("id", editingCategory.id);
        
        if (error) throw error;
        
        setCategories(categories.map(c => 
          c.id === editingCategory.id 
            ? { ...c, name: formData.name, display_order: formData.display_order } 
            : c
        ).sort((a,b) => a.display_order - b.display_order));
      } else {
        // Insert
        const { data, error } = await supabase
          .from("mrc_categories")
          .insert({ name: formData.name, display_order: formData.display_order })
          .select()
          .single();
          
        if (error) throw error;
        
        setCategories([...categories, { ...data, sub_categories_count: 0, items_count: 0 }].sort((a,b) => a.display_order - b.display_order));
        setStats(s => ({ ...s, totalCategories: s.totalCategories + 1 }));
      }
      setIsModalOpen(false);
    } catch (error: any) {
      alert("Error saving category: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setCategories(categories.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
      
      const { error } = await supabase
        .from("mrc_categories")
        .update({ is_active: !currentStatus })
        .eq("id", id);
        
      if (error) throw error;
    } catch (err: any) {
      alert("Failed to toggle status: " + err.message);
      // Revert optimistic update
      fetchData(); 
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800">Connection Error</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={() => { setError(null); fetchData(); }}
          className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-xl shrink-0">
            <Layers className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Categories</p>
            <p className="text-xl md:text-2xl font-black text-slate-800">{stats.totalCategories}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-xl shrink-0">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total SKUs</p>
            <p className="text-xl md:text-2xl font-black text-slate-800">{stats.totalSkus}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex items-center space-x-4">
          <div className="bg-purple-100 p-3 rounded-xl shrink-0">
            <MapPin className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Cities</p>
            <p className="text-xl md:text-2xl font-black text-slate-800">{stats.activeCities}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50/50 gap-4">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800">Item Categories</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">Manage core MRC groupings</p>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 md:py-2 rounded-xl font-bold transition-all shadow-sm touch-target"
          >
            <Plus className="w-5 h-5 md:w-4 md:h-4" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Category Name</th>
                <th className="px-6 py-4">Sub-categories</th>
                <th className="px-6 py-4">Total SKUs</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                    No categories found.
                  </td>
                </tr>
              ) : categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-black text-slate-400 font-mono">{cat.display_order}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/mrc/${cat.id}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors">
                      {cat.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-black">{cat.sub_categories_count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-black">{cat.items_count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleActive(cat.id, cat.is_active)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                        cat.is_active 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cat.is_active ? "bg-green-500" : "bg-slate-400")} />
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => openEditModal(cat)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <Link 
                        href={`/admin/mrc/${cat.id}`}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-slate-100">
          {categories.length === 0 ? (
             <div className="p-12 text-center text-slate-400 font-bold">No categories found.</div>
          ) : categories.map((cat) => (
             <div key={cat.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                   <Link href={`/admin/mrc/${cat.id}`} className="font-bold text-slate-800 text-sm">
                      {cat.name}
                   </Link>
                   <button 
                      onClick={() => toggleActive(cat.id, cat.is_active)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        cat.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-100'
                      )}
                   >
                      {cat.is_active ? 'Active' : 'Inactive'}
                   </button>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                   <div className="flex gap-4">
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Subs</p>
                         <p className="text-xs font-bold text-slate-700">{cat.sub_categories_count}</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">SKUs</p>
                         <p className="text-xs font-bold text-slate-700">{cat.items_count}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(cat)}
                        className="p-2.5 text-blue-600 bg-white border border-slate-100 rounded-xl"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <Link 
                        href={`/admin/mrc/${cat.id}`}
                        className="p-2.5 text-slate-400 bg-white border border-slate-100 rounded-xl"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                   </div>
                </div>
             </div>
          ))}
        </div>
      </div>

      {/* Inline Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-semibold text-slate-800">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="e.g. False Ceiling"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
                <input 
                  type="number" 
                  value={formData.display_order}
                  onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Lower numbers appear first in the UI.</p>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
