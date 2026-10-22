"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { createClient } from "@/lib/supabase/client";
import { 
  Layers, 
  MapPin, 
  ArrowRight,
  Search,
  Filter
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function DAProjectsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { cities, getUserById } = useAppDataStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "new" | "in_progress" | "completed">("all");
  const supabase = createClient();

  useEffect(() => {
    if (!currentUser) return;

    async function fetchAssignments() {
      const { data, error } = await supabase
        .from("gfc_requests")
        .select(`
          *,
          quotes (
            project_id,
            total,
            status,
            payment_confirmed_at,
            validation_requests (
              customer_name,
              city_id
            )
          )
        `)
        .eq("assigned_da_id", currentUser.id)
        .order("assigned_at", { ascending: false });

      if (!error && data) {
        setAssignments(data);
      }
      setLoading(false);
    }

    fetchAssignments();
  }, [currentUser, supabase]);

  const filteredAssignments = assignments.filter(a => {
    if (activeTab === "all") return true;
    if (activeTab === "new") return a.status === 'assigned';
    if (activeTab === "in_progress") return ['uploaded', 'vl_approved', 'vm_approved'].includes(a.status);
    if (activeTab === "completed") return a.status === 'published';
    return true;
  });

  if (!currentUser) return null;

  return (
    <div className="container py-8 md:py-12 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary">My GFC Projects</h1>
        <p className="text-xs text-brand-muted mt-1 uppercase font-black tracking-widest">Total Active Assignments: {assignments.length}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-full md:w-fit">
        {["all", "new", "in_progress", "completed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "flex-1 px-6 py-2.5 text-xs font-black uppercase tracking-tighter rounded-xl transition-all",
              activeTab === tab ? "bg-secondary text-white shadow-md shadow-secondary/20" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
             Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-3xl" />
             ))
        ) : filteredAssignments.length === 0 ? (
          <div className="p-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
            <Filter className="w-10 h-10 text-slate-200 mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">No projects found in this category.</p>
          </div>
        ) : (
          filteredAssignments.map((a) => {
             const city = cities.find(c => c.id === a.quotes?.validation_requests?.city_id)?.name || "Unknown";
             const vm = getUserById(a.assigned_by);
             
             return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                 {/* Status Accent */}
                 <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    a.status === 'assigned' ? "bg-amber-500" :
                    a.status === 'published' ? "bg-emerald-500" : "bg-blue-500"
                 )} />

                 <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                       <h3 className="text-xl font-black text-secondary tracking-tight">{a.quotes?.project_id}</h3>
                       <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
                          a.status === 'assigned' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          a.status === 'published' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                       )}>
                          {a.status.replace(/_/g, ' ')}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Customer</p>
                          <p className="text-xs font-bold text-slate-700 truncate">{a.quotes?.validation_requests?.customer_name}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">City</p>
                          <p className="text-xs font-bold text-slate-700">{city}</p>
                       </div>
                       <div className="col-span-2 md:col-span-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Assigned By / Date</p>
                          <p className="text-xs font-bold text-slate-700">{vm?.full_name || 'VM'} • {formatDateTime(a.assigned_at).split(',')[0]}</p>
                       </div>
                       <div className="col-span-2 md:col-span-1">
                          <p className="text-[9px] font-bold text-emerald-500 uppercase mb-1">Payment Confirmed</p>
                          <p className="text-xs font-bold text-emerald-700 italic">
                             {a.quotes?.payment_confirmed_at ? formatDateTime(a.quotes.payment_confirmed_at).split(',')[0] : '—'}
                          </p>
                       </div>
                    </div>
                 </div>

                 <Link 
                    href={`/design-associate/projects/${a.id}`}
                    className="flex items-center justify-center gap-2 bg-secondary text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-secondary-hover transition-all shadow-lg shadow-secondary/10"
                 >
                    Open Project <ArrowRight className="w-4 h-4" />
                 </Link>
              </div>
             );
          })
        )}
      </div>
    </div>
  );
}
