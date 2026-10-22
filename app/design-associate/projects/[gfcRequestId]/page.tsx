"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, 
  MapPin, 
  Clock, 
  FileText, 
  Camera, 
  Receipt, 
  Upload, 
  X, 
  CheckCircle,
  FileIcon,
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function DAProjectDetailPage({ params }: { params: { gfcRequestId: string } }) {
  const gfcRequestId = params.gfcRequestId;
  const currentUser = useAuthStore((s) => s.currentUser);
  const { getUserById, cities } = useAppDataStore();
  
  const [data, setData] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<"info" | "site" | "quote" | "upload">("info");
  const [siteSubTab, setSiteSubTab] = useState<"report" | "photos">("report");
  
  // Upload state
  const [files, setFiles] = useState<{ file: File; name: string; type: string }[]>([]);
  const [daNotes, setDaNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: gfcReq, error } = await supabase
        .from("gfc_requests")
        .select(`
          *,
          quotes (
            *,
            validation_requests (*)
          )
        `)
        .eq("id", gfcRequestId)
        .single();

      if (!error && gfcReq) {
        setData(gfcReq);
        
        // Fetch Line Items
        const { data: items } = await supabase
          .from("quote_line_items")
          .select("*")
          .eq("quote_id", gfcReq.quote_id);
        setLineItems(items || []);

        // Fetch Existing Drawings
        const { data: drws } = await supabase
          .from("gfc_drawings")
          .select("*")
          .eq("gfc_request_id", gfcRequestId);
        setDrawings(drws || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [gfcRequestId, supabase]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map(f => ({
      file: f,
      name: f.name,
      type: "Floor Plan"
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index: number, name: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, name } : f));
  };

  const updateFileType = (index: number, type: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, type } : f));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("Please upload at least one drawing.");
      return;
    }
    setUploading(true);
    try {
      // 1. Upload each file to Storage
      const drawingMetadata = [];
      for (const f of files) {
        const fileExt = f.file.name.split('.').pop();
        const filePath = `gfc-drawings/${gfcRequestId}/${Math.random().toString(36).substring(7)}_${f.name}`;
        
        const { error: uploadErr } = await supabase.storage
          .from("site-assets") // Using existing bucket or new one
          .upload(filePath, f.file);
        
        if (uploadErr) throw uploadErr;
        
        drawingMetadata.push({
          gfc_request_id: gfcRequestId,
          file_name: f.name,
          file_type: f.type,
          file_path: filePath,
          uploaded_by: currentUser?.id
        });
      }

      // 2. Insert into gfc_drawings
      const { error: metaErr } = await supabase
        .from("gfc_drawings")
        .insert(drawingMetadata);
      if (metaErr) throw metaErr;

      // 3. Update gfc_request status
      const { error: updateErr } = await supabase
        .from("gfc_requests")
        .update({ 
          status: 'uploaded', 
          da_notes: daNotes,
          updated_at: new Date().toISOString() 
        })
        .eq("id", gfcRequestId);
      if (updateErr) throw updateErr;

      // 4. Notify VL and VM
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", currentUser?.id).single();
      const daName = profile?.full_name || "DA";

      const pid = data.quotes?.project_id;
      const notifications = [
        {
          user_id: data.quotes?.created_by, // VL
          title: `GFC Uploaded — ${pid}`,
          message: `DA ${daName} has uploaded GFC drawings for ${pid}. Please review.`,
          type: "gfc_uploaded",
          metadata: { gfcRequestId, pid }
        },
        {
          user_id: data.assigned_by, // VM
          title: `GFC Uploaded — ${pid}`,
          message: `DA ${daName} has uploaded GFC drawings for ${pid}. Please review.`,
          type: "gfc_uploaded",
          metadata: { gfcRequestId, pid }
        }
      ];
      await supabase.from("notifications").insert(notifications);

      alert("Drawings submitted for review successfully!");
      window.location.reload();

    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!data) return <div className="p-20 text-center font-bold">Project not found.</div>;

  const quote = data.quotes;
  const valReq = quote.validation_requests;
  const vm = getUserById(data.assigned_by);
  const city = cities.find(c => c.id === valReq.city_id)?.name || "—";

  return (
    <div className="container py-6 md:py-10 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <Link href="/design-associate/projects" className="text-slate-400 hover:text-secondary p-1">
                <AlertCircle className="w-5 h-5 rotate-180" />
             </Link>
             <h1 className="text-3xl font-black text-secondary tracking-tight">{quote.project_id}</h1>
             <span className={cn(
                "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter",
                data.status === 'assigned' ? "bg-amber-100 text-amber-700" :
                data.status === 'published' ? "bg-emerald-100 text-emerald-700" :
                "bg-blue-100 text-blue-700"
             )}>
                {data.status.replace(/_/g, ' ')}
             </span>
          </div>
          <p className="text-brand-muted text-sm font-medium ml-9">{valReq.customer_name} • {city} • {valReq.property_type}</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto">
        {[
          { id: "info", label: "Project Info", icon: <Building2 className="w-4 h-4" /> },
          { id: "site", label: "Site Data", icon: <Camera className="w-4 h-4" /> },
          { id: "quote", label: "Quotation", icon: <Receipt className="w-4 h-4" /> },
          { id: "upload", label: "GFC Drawings", icon: <Upload className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id as any)}
            className={cn(
              "whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2",
              activeMainTab === tab.id ? "bg-white text-secondary shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
        
        {/* SECTION 1: INFO */}
        {activeMainTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-6">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">Location Details</h3>
                 <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <MapPin className="w-5 h-5 text-primary mt-1" />
                        <div>
                            <p className="text-sm font-bold text-slate-800">{valReq.address}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{city}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">BHK / Area</p>
                            <p className="text-xs font-bold text-secondary">{valReq.property_type || '—'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Contact</p>
                            <p className="text-xs font-bold text-secondary">{valReq.customer_phone || '—'}</p>
                        </div>
                    </div>
                 </div>
             </div>

             <div className="space-y-6">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2">Timeline & Stakes</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> KOM Date
                        </p>
                        <p className="text-lg font-black text-emerald-800">{quote.kom_date ? new Date(quote.kom_date).toLocaleDateString() : 'TBD'}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Assigned By / At</p>
                        <p className="text-sm font-bold text-blue-800">{vm?.full_name || 'VM'}</p>
                        <p className="text-[10px] font-bold text-blue-400 mt-1">{formatDateTime(data.assigned_at).split(',')[0]}</p>
                    </div>
                 </div>
                 {data.vm_notes && (
                    <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">VM Instructions</p>
                        <p className="text-xs text-slate-600 leading-relaxed italic">"{data.vm_notes}"</p>
                    </div>
                 )}
             </div>
          </div>
        )}

        {/* SECTION 2: SITE DATA */}
        {activeMainTab === "site" && (
          <div className="space-y-8">
             <div className="flex bg-slate-50 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setSiteSubTab("report")}
                  className={cn("px-6 py-2 rounded-lg text-xs font-bold transition-all", siteSubTab === "report" ? "bg-white text-secondary shadow-sm" : "text-slate-400")}
                >
                  Validation Report
                </button>
                <button 
                  onClick={() => setSiteSubTab("photos")}
                  className={cn("px-6 py-2 rounded-lg text-xs font-bold transition-all", siteSubTab === "photos" ? "bg-white text-secondary shadow-sm" : "text-slate-400")}
                >
                  Site Photos
                </button>
             </div>

             {siteSubTab === "report" && (
                <div className="space-y-6">
                    {/* Measurements Table Simplified */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b">
                                <tr>
                                    <th className="px-4 py-3">Room Name</th>
                                    <th className="px-4 py-3">Dimensions (L x W x H)</th>
                                    <th className="px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(valReq.validation_data?.rooms || {}).map(([name, r]: any) => (
                                    <tr key={name}>
                                        <td className="px-4 py-4 font-bold text-secondary uppercase text-xs">{name}</td>
                                        <td className="px-4 py-4 text-xs font-mono">
                                            {r.dimensions?.length || 0}' x {r.dimensions?.width || 0}' x {r.dimensions?.height || 0}'
                                        </td>
                                        <td className="px-4 py-4 text-[11px] text-slate-500 italic max-w-xs">{r.notes || "No notes"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             )}

             {siteSubTab === "photos" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(valReq.validation_data?.rooms || {}).map(([room, r]: any) => (
                        (r.photos || []).map((p: any, i: number) => (
                            <div key={`${room}-${i}`} className="group relative rounded-2xl overflow-hidden aspect-square bg-slate-100 border border-slate-100">
                                <img src={p.url} alt={room} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-[9px] font-black text-white uppercase tracking-widest">{room}</p>
                                    <p className="text-[8px] text-white/70 uppercase">{p.surfaceType || 'Unknown'}</p>
                                </div>
                            </div>
                        ))
                    ))}
                    {(!valReq.validation_data?.rooms || Object.values(valReq.validation_data.rooms).every((r: any) => !r.photos?.length)) && (
                        <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium italic">No site photos available.</div>
                    )}
                </div>
             )}
          </div>
        )}

        {/* SECTION 3: QUOTATION */}
        {activeMainTab === "quote" && (
          <div className="space-y-8">
             <div className="flex justify-between items-end pb-4 border-b">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quote Summary</p>
                    <h3 className="text-xl font-black text-secondary uppercase tracking-tight">{quote.quote_number} (v{quote.version})</h3>
                </div>
                <p className="text-2xl font-black text-secondary">₹{Math.round(quote.total).toLocaleString('en-IN')}</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    {lineItems.length === 0 ? (
                        <p className="text-center py-10 text-slate-400 text-sm">No items found.</p>
                    ) : (
                        <div className="overflow-x-auto border rounded-2xl">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {lineItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 font-bold text-slate-800">{item.item_name}</td>
                                            <td className="px-4 py-3 text-slate-500 uppercase">{item.service_on}</td>
                                            <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right font-black">₹{Math.round(item.amount).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-50 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Scope Analytics</h4>
                    <ul className="space-y-3">
                        {Array.from(new Set(lineItems.map(i => i.service_on))).map(cat => (
                            <li key={cat} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                {cat || "General Items"}
                            </li>
                        ))}
                    </ul>
                    <div className="pt-4 border-t border-slate-200 mt-2">
                        <p className="text-[9px] text-slate-400 italic">DA Tip: Check Electrical and False Ceiling categories for specific layout requirements.</p>
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* SECTION 4: UPLOAD */}
        {activeMainTab === "upload" && (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-bold text-secondary">GFC Drawings Management</h3>
                    {data.status === 'assigned' && <p className="text-xs text-brand-muted mt-0.5">Upload multiple PDF/AutoCAD layouts for review.</p>}
                 </div>
                 {data.status !== 'assigned' && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-2 shadow-sm border border-emerald-100">
                       <CheckCircle className="w-4 h-4" /> Already Submitted For Review
                    </span>
                 )}
             </div>

             {/* Existing Drawings */}
             {drawings.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Drawings ({drawings.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {drawings.map(d => (
                            <div key={d.id} className="bg-white border rounded-2xl p-4 flex items-center justify-between hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-400">
                                        <FileIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{d.file_name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{d.file_type} • {formatDateTime(d.uploaded_at).split(',')[0]}</p>
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-primary hover:underline">View</button>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {/* Upload Interface */}
             {data.status === 'assigned' && (
                 <div className="space-y-6 border-t pt-8">
                    <div 
                        onClick={() => document.getElementById('gfc-upload')?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-3 hover:border-primary/30 cursor-pointer transition-all bg-slate-50/50"
                    >
                        <Upload className="w-10 h-10 text-slate-300" />
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-700">Click to upload AutoCAD / PDF drawings</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, DWG, PNG, JPG (Max 50MB per file)</p>
                        </div>
                        <input 
                            id="gfc-upload"
                            type="file" 
                            multiple 
                            onChange={handleFileUpload}
                            className="hidden" 
                        />
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-800">Selected Files ({files.length})</h4>
                            <div className="space-y-3">
                                {files.map((f, i) => (
                                    <div key={i} className="bg-white border p-3 rounded-2xl flex flex-wrap items-center gap-4">
                                        <div className="flex-1 min-w-[200px]">
                                            <input 
                                                type="text" 
                                                value={f.name}
                                                onChange={(e) => updateFileName(i, e.target.value)}
                                                className="w-full text-xs font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-primary outline-none py-1"
                                            />
                                        </div>
                                        <select 
                                            value={f.type}
                                            onChange={(e) => updateFileType(i, e.target.value)}
                                            className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg outline-none"
                                        >
                                            {["Floor Plan", "Ceiling Plan", "Electrical Layout", "Plumbing Layout", "Elevation", "Section", "Other"].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-700">Add notes for review (Optional)</label>
                        <textarea 
                            value={daNotes}
                            onChange={e => setDaNotes(e.target.value)}
                            placeholder="Specify details about layouts, challenges or clarifications..."
                            className="mobile-input px-4 py-4 h-24 resize-none"
                        />
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={uploading || files.length === 0}
                        className="w-full py-4 bg-secondary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-secondary-hover transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Drawings For Review"}
                    </button>
                 </div>
             )}

          </div>
        )}
      </div>
    </div>
  );
}
