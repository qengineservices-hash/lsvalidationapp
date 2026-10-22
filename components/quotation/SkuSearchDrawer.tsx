"use client";

import { useState, useEffect, useRef } from "react";
import { useQuoteStore } from "@/stores/useQuoteStore";
import { X, Search, Filter, Plus, Loader2 } from "lucide-react";
import { getAutoQuantity, calculateFullHomePaintingArea, MRCItem, RoomMeasurements } from "@/lib/mrc-calculations";
import { getValidationRooms } from "@/lib/quotation";

export default function SkuSearchDrawer({ 
  isOpen, 
  onClose,
  targetRoom,
  validationData
}: { 
  isOpen: boolean, 
  onClose: () => void,
  targetRoom: string,
  validationData: any
}) {
  const store = useQuoteStore();
  const quote = store.currentQuote;
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MRCItem[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [recentSkus, setRecentSkus] = useState<MRCItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState(targetRoom);
  const [addingId, setAddingId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rooms = getValidationRooms(validationData);
  
  // Simple session cache: keyed by cityId, stores all MRC items fetched
  const cacheRef = useRef<Record<string, MRCItem[]>>({});

  // Load Recent SKUs from local storage
  useEffect(() => {
    const stored = localStorage.getItem("ls_recent_skus_v2");
    if (stored) {
      try {
        setRecentSkus(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const addToRecent = (item: MRCItem) => {
    setRecentSkus(prev => {
      const newRecent = [item, ...prev.filter(i => i.id !== item.id)].slice(0, 10);
      localStorage.setItem("ls_recent_skus_v2", JSON.stringify(newRecent));
      return newRecent;
    });
  };

  const searchSkus = async (searchQuery: string) => {
    if (!quote) return;
    const cityId = quote.city_id;
    
    // Check cache first
    if (cacheRef.current[cityId] && cacheRef.current[cityId].length > 0) {
      // Filter locally
      if (!searchQuery.trim()) {
        setResults(cacheRef.current[cityId]);
      } else {
        const q = searchQuery.toLowerCase();
        const filtered = cacheRef.current[cityId].filter(item => 
          item.sku_name.toLowerCase().includes(q) ||
          item.sku_code.toLowerCase().includes(q) ||
          (item.sub_category_name || "").toLowerCase().includes(q) ||
          (item.category_name || "").toLowerCase().includes(q)
        );
        setResults(filtered);
      }
      setDisplayCount(20);
      return;
    }

    // First open: fetch all MRC items for this city and cache them
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (cityId) qs.append("cityId", cityId);
      qs.append("limit", "500"); // Fetch all for caching

      const res = await fetch(`/api/mrc/search?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      
      // Cache the full result set
      cacheRef.current[cityId] = data;
      
      // Apply local filter
      if (!searchQuery.trim()) {
        setResults(data);
      } else {
        const q = searchQuery.toLowerCase();
        setResults(data.filter((item: MRCItem) => 
          item.sku_name.toLowerCase().includes(q) ||
          item.sku_code.toLowerCase().includes(q) ||
          (item.sub_category_name || "").toLowerCase().includes(q)
        ));
      }
      setDisplayCount(20);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search — now uses cache for instant filtering
  useEffect(() => {
    // If we have a cache, filter locally (instant)
    const cityId = quote?.city_id || "";
    if (cacheRef.current[cityId] && cacheRef.current[cityId].length > 0) {
      searchSkus(query);
      return;
    }
    // No cache yet — debounce the network call
    const timer = setTimeout(() => {
      searchSkus(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle Add to Room logic
  const handleAdd = async (item: MRCItem) => {
    if (!quote) return;
    setAddingId(item.id);
    
    // Attempt Auto Calculation
    let calculatedQty = 0;
    let isAuto = false;
    let remarks = "";

    // Use selectedRoom instead of targetRoom for flexibility
    if (selectedRoom === "Full Home") {
       const fullHomeMetrics = calculateFullHomePaintingArea(rooms);
       
       const catName = item.category_name || "";
       const serviceOn = item.service_on || "";

       if (serviceOn === "Ceiling" && (catName.includes("Painting") || catName.includes("False Ceiling"))) {
          calculatedQty = fullHomeMetrics.totalCeilingArea;
          isAuto = true;
          // Build breakdown string
          const parts = fullHomeMetrics.roomBreakdown.map(r => `${r.roomName} (${r.ceiling} sqft)`);
          remarks = `Sum of all rooms: ${parts.join(" + ")} = ${calculatedQty} sqft`;
       } else if (serviceOn === "Walls" && catName.includes("Painting")) {
          calculatedQty = fullHomeMetrics.totalWallArea;
          isAuto = true;
          const parts = fullHomeMetrics.roomBreakdown.map(r => `${r.roomName} (${r.walls} sqft)`);
          remarks = `Sum of all rooms: ${parts.join(" + ")} = ${calculatedQty} sqft`;
       } else if (serviceOn === "Floor") {
          calculatedQty = fullHomeMetrics.totalFloorArea;
          isAuto = true;
          const parts = fullHomeMetrics.roomBreakdown.map(r => `${r.roomName} (${r.floor} sqft)`);
          remarks = `Sum of all rooms: ${parts.join(" + ")} = ${calculatedQty} sqft`;
       }
    } else {
       const m = rooms?.[selectedRoom]?.measurements;
       const measurements: RoomMeasurements = {
          roomLength: m?.roomLength || 0,
          roomWidth: m?.roomWidth || 0,
          ceilingHeight: m?.ceilingHeight || 0
       };

       const calcResult = getAutoQuantity(item, measurements);
       if (calcResult) {
          calculatedQty = calcResult.quantity;
          isAuto = calcResult.isAutoCalculated;
          remarks = calcResult.basis;
       }
    }

    try {
      await store.addLineItem({
        quote_id: quote.id,
        room_name: selectedRoom,
        item_type: "mrc",
        mrc_item_id: item.id,
        item_name: item.sku_name,
        service_on: item.service_on || "",
        description: item.sub_category_name || "",
        unit: item.unit,
        quantity: calculatedQty,
        unit_price: item.rate,
        is_auto_calculated: isAuto,
        remarks: remarks || "Manual entry required"
      });
      
      addToRecent(item);
      onClose();
    } catch (err) {
      alert("Error adding item");
    } finally {
      setAddingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-0 md:right-0 md:top-0 md:bottom-0 md:w-[450px] w-full bg-white shadow-2xl z-50 flex flex-col animate-in md:slide-in-from-right-8 slide-in-from-bottom-8 duration-300">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-800">Add MRC Item</h2>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Search rate card for items.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Selector */}
        <div className="px-4 md:px-5 pt-4 pb-2 border-b border-slate-100">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block">Add to Room</label>
          <div className="scroll-tabs pb-2">
            {[targetRoom, ...(targetRoom !== 'Full Home' ? ['Full Home'] : [])].map(room => (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target ${
                  selectedRoom === room
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 md:p-5 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search items... (⌘K)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="mobile-input pl-11 pr-4 py-3 bg-slate-50"
            />
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
          {loading && (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && query === "" && recentSkus.length > 0 && (
             <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2">Recently Used</h3>
                <div className="space-y-2">
                  {recentSkus.map(item => (
                    <SkuCard 
                      key={`recent-${item.id}`} 
                      item={item} 
                      onAdd={() => handleAdd(item)} 
                      adding={addingId === item.id} 
                    />
                  ))}
                </div>
             </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
               {query !== "" && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2">Search Results</h3>}
               <div className="space-y-2">
                  {results.slice(0, displayCount).map(item => (
                    <SkuCard 
                      key={item.id} 
                      item={item} 
                      onAdd={() => handleAdd(item)} 
                      adding={addingId === item.id} 
                    />
                  ))}
               </div>
               
               {displayCount < results.length && (
                 <button
                   onClick={() => setDisplayCount(prev => prev + 20)}
                   className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-white border-2 border-dashed border-blue-100 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                 >
                   Load More ({results.length - displayCount} remaining)
                 </button>
               )}
            </div>
          )}

          {!loading && results.length === 0 && query !== "" && (
             <div className="text-center p-8 text-slate-500">
               <p>No MRC items found matching "{query}".</p>
             </div>
          )}
        </div>

      </div>
    </>
  );
}

function SkuCard({ item, onAdd, adding }: { item: MRCItem, onAdd: () => void, adding: boolean }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors group">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
              {item.category_name}
            </span>
            {item.sub_category_name && (
               <span className="text-[10px] font-medium text-slate-400 px-1 border-l border-slate-200">
                 {item.sub_category_name}
               </span>
            )}
            {item.service_on && (
               <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                 {item.service_on}
               </span>
            )}
          </div>
          <p className="font-semibold text-slate-800 text-sm leading-snug">{item.sku_name}</p>
          {item.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 italic">{item.description}</p>}
          <p className="text-xs text-slate-400 font-mono mt-1">{item.sku_code}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800">₹{item.rate.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500">per {item.unit}</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1 flex-1 pr-4">{item.sub_category_name || item.category_name || ''}</p>
        <button 
          onClick={onAdd}
          disabled={adding}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-black rounded-xl transition-all disabled:opacity-50 touch-target"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          <span>Add Item</span>
        </button>
      </div>
    </div>
  );
}
