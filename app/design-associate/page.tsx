"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { createClient } from "@/lib/supabase/client";
import { 
  Layers, 
  Clock, 
  MapPin, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function DADashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { cities } = useAppDataStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (!currentUser) return null;

  const city = cities.find(c => c.id === assignments[0]?.quotes?.validation_requests?.city_id)?.name || "Unknown City";

  const stats = {
    new: assignments.filter(a => a.status === 'assigned').length,
    inProgress: assignments.filter(a => a.status === 'uploaded' || a.status === 'vl_approved').length,
    completed: assignments.filter(a => a.status === 'published').length
  };

  return (
    <div className="container py-8 md:py-12 max-w-4xl space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary">
            Hello, <span className="text-primary">{currentUser.full_name}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-secondary-light text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {city}
            </span>
            <span className="text-xs text-brand-muted font-medium italic">Design Associate Portal</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Assignments</p>
          <p className="text-2xl font-black text-secondary">{stats.new}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Progress</p>
          <p className="text-2xl font-black text-amber-600">{stats.inProgress}</p>
        </div>
        <div className="bg-secondary p-5 rounded-2xl border border-secondary shadow-lg shadow-secondary/20 text-white col-span-2 md:col-span-1">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Completed This Month</p>
          <p className="text-2xl font-black text-accent">{stats.completed}</p>
        </div>
      </div>

      {/* Recent Assignments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Recent Assignments
            </h2>
            <Link href="/design-associate/projects" className="text-xs font-bold text-primary hover:underline">View All</Link>
        </div>

        {loading ? (
          <div className="h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center">
            <Clock className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
            <Layers className="w-10 h-10 text-slate-200 mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium whitespace-pre">
              No GFC assignments yet.{"\n"}They will appear here once the VM assigns projects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assignments.slice(0, 5).map((a) => (
              <div key={a.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                <div className="flex gap-4 items-center">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        a.status === 'assigned' ? "bg-amber-50 text-amber-600" :
                        a.status === 'published' ? "bg-emerald-50 text-emerald-600" :
                        "bg-blue-50 text-blue-600"
                    )}>
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 uppercase tracking-tight">{a.quotes?.project_id}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Assigned on {formatDateTime(a.assigned_at).split(',')[0]}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className={cn(
                        "text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter",
                        a.status === 'assigned' ? "bg-amber-100 text-amber-700" :
                        a.status === 'published' ? "bg-emerald-100 text-emerald-700" :
                        "bg-blue-100 text-blue-700"
                    )}>
                        {a.status.replace(/_/g, ' ')}
                    </span>
                    <Link 
                        href={`/design-associate/projects/${a.id}`}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-secondary hover:text-white transition-all group-hover:translate-x-1"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
