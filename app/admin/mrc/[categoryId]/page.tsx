"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MRCItemDrawer from "@/components/admin/MRCItemDrawer";
import { 
  Plus, Edit2, CheckCircle2, XCircle, Search, 
  Filter, Loader2, ArrowLeft, MoreVertical, Package
} from "lucide-react";
import Link from "next/link";

export default function CategoryDetailPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<any>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [subCatFilter, setSubCatFilter] = useState("");

  // Sub-category Form
  const [newSubCat, setNewSubCat] = useState("");
  const [addingSubCat, setAddingSubCat] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: cat }, { data: subs }, { data: its }, { data: cits }] = await Promise.all([
        supabase.from("mrc_categories").select("*").eq("id", categoryId).single(),
        supabase.from("mrc_sub_categories").select("*").eq("category_id", categoryId).order("display_order"),
        supabase.from("mrc_items").select("*").eq("category_id", categoryId).order("created_at", { ascending: false }),
        supabase.from("app_cities").select("*").eq("is_active", true)
      ]);
      
      if (cat) setCategory(cat);
      if (subs) setSubCategories(subs);
      if (its) setItems(its);
      if (cits) setCities(cits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCat.trim()) return;
    setAddingSubCat(true);
    try {
      const maxOrder = subCategories.reduce((max, s) => Math.max(max, s.display_order || 0), 0);
      const { data, error } = await supabase.from("mrc_sub_categories").insert({
        category_id: categoryId,
        name: newSubCat.trim(),
        display_order: maxOrder + 10
      }).select().single();

      if (error) throw error;
      setSubCategories([...subCategories, data]);
      setNewSubCat("");
    } catch (err: any) {
      alert("Error adding sub-category: " + err.message);
    } finally {
      setAddingSubCat(false);
    }
  };

  const toggleSubCategoryActive = async (id: string, currentStatus: boolean) => {
    setSubCategories(subCategories.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    await supabase.from("mrc_sub_categories").update({ is_active: !currentStatus }).eq("id", id);
  };

  const toggleItemActive = async (id: string, currentStatus: boolean) => {
    setItems(items.map(i => i.id === id ? { ...i, is_active: !currentStatus } : i));
    await supabase.from("mrc_items").update({ is_active: !currentStatus }).eq("id", id);
  };

  const openDrawer = (item: any = null) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = (item.sku_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                          (item.sku_code?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      const matchCity = cityFilter ? item.city_id === cityFilter : true;
      const matchSubCat = subCatFilter ? item.sub_category_id === subCatFilter : true;
      return matchSearch && matchCity && matchSubCat;
    });
  }, [items, searchQuery, cityFilter, subCatFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!category) return <div>Category not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <Link href="/admin/mrc" className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Categories
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{category.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Sub categories */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-800">Sub-Categories</h2>
            </div>
            <div className="p-4">
              <form onSubmit={handleAddSubCategory} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newSubCat}
                  onChange={e => setNewSubCat(e.target.value)}
                  placeholder="New sub-category..."
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  type="submit" 
                  disabled={addingSubCat || !newSubCat.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex-shrink-0 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {subCategories.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No sub-categories yet.</p>
                ) : subCategories.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group border border-transparent hover:border-slate-100">
                    <span className="text-sm font-medium text-slate-700 truncate">{sub.name}</span>
                    <button 
                      onClick={() => toggleSubCategoryActive(sub.id, sub.is_active)}
                      className={`text-xs ml-2 rounded-full p-1 transition-colors ${sub.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      {sub.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SKU Items */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Header & Controls */}
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 text-lg">Line Items (SKUs)</h2>
                <button 
                  onClick={() => openDrawer()}
                  disabled={subCategories.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add SKU</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search SKUs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex space-x-3">
                  <select 
                    value={cityFilter}
                    onChange={e => setCityFilter(e.target.value)}
                    className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">All Cities</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select 
                    value={subCatFilter}
                    onChange={e => setSubCatFilter(e.target.value)}
                    className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">All Sub-categories</option>
                    {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0 border-b border-slate-200 shadow-sm z-0">
                    <th className="p-4 font-semibold">SKU Code</th>
                    <th className="p-4 font-semibold">Item Name</th>
                    <th className="p-4 font-semibold">City</th>
                    <th className="p-4 font-semibold">Unit</th>
                    <th className="p-4 font-semibold text-right">Rate</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center">
                          <Package className="w-12 h-12 text-slate-200 mb-3" />
                          <p>No SKUs found matching your filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.map((item) => {
                    const cityName = !item.city_id ? "Global (All Cities)" : (cities.find(c => c.id === item.city_id)?.name || "Unknown");
                    // sub cat name could be fetched if needed, skipped for brevity in table row
                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="p-4 text-sm font-mono text-slate-600">{item.sku_code}</td>
                        <td className="p-4 text-sm font-medium text-slate-800 w-1/3">
                          {item.sku_name}
                          {item.service_on && <span className="block text-xs font-normal text-slate-400 mt-0.5">Service: {item.service_on}</span>}
                        </td>
                        <td className="p-4 text-sm text-slate-600">{cityName}</td>
                        <td className="p-4 text-sm text-slate-600">
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 font-medium">{item.unit}</span>
                        </td>
                        <td className="p-4 text-sm text-slate-800 font-semibold text-right">
                          ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => toggleItemActive(item.id, item.is_active)}
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              item.is_active ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => openDrawer(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <MRCItemDrawer 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categoryId={categoryId}
        subCategories={subCategories}
        cities={cities}
        editingItem={editingItem}
        onSuccess={() => {
          fetchData(); // Simplest way to ensure fully consistent state
        }}
      />
    </div>
  );
}
