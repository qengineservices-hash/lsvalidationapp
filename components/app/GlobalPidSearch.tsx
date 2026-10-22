"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, Hash, ArrowRight } from "lucide-react";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import RequestCard from "@/components/dashboard/RequestCard";

export default function GlobalPidSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const { validationRequests } = useAppDataStore();
  const { currentUser } = useAuthStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const results = query.length >= 3 
    ? validationRequests.filter(r => 
        r.pid.includes(query) || 
        r.customer_name.toLowerCase().includes(query.toLowerCase()) ||
        r.request_number.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  if (!mounted) return null;

  const searchOverlay = (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[10vh] px-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      
      <div className="bg-slate-50 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search PID, Customer or Request #..."
            className="flex-1 outline-none text-base font-medium text-slate-700 bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 custom-scrollbar">
          {query.length > 0 && query.length < 3 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Type at least 3 characters to search...
            </div>
          )}

          {query.length >= 3 && results.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No projects found matching "<span className="text-slate-600 font-bold">{query}</span>"
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="px-1 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                <span>Matching Projects ({results.length})</span>
                <span className="text-[9px] font-normal lowercase italic text-slate-300">showing top 5</span>
              </div>
              <div className="flex flex-col gap-4">
                {results.map((r) => {
                   const isVM = currentUser?.role === 'validation_manager' || currentUser?.role === 'admin';
                   const hasReport = r.status === "report_generated" || r.status === "validation_done";
                   
                   // Determine the correct action URL based on role and status
                   let actionHref = "";
                   if (currentUser?.role === 'designer') {
                     actionHref = hasReport ? `/reports/${r.id}` : "";
                   } else if (currentUser?.role === 'validation_lead') {
                     actionHref = `/validation-lead/validate/${r.id}`;
                   } else if (isVM) {
                     if (r.assigned_to) {
                       actionHref = hasReport ? `/reports/${r.id}` : `/validation-lead/validate/${r.id}`;
                     }
                   }

                   return (
                     <div key={r.id} onClick={(e) => {
                       // If the click happened on a button or link inside the card, don't close yet
                       // But handleCardClick inside RequestCard will handle the navigation
                       if ((e.target as HTMLElement).closest('button, a')) return;
                       // For the card click itself, we can close the overlay
                       setTimeout(() => setIsOpen(false), 100);
                     }}>
                       <RequestCard 
                         request={r}
                         showAssignee={true}
                         actionHref={actionHref}
                       />
                     </div>
                   );
                })}
              </div>
            </div>
          )}
          
          {query.length === 0 && (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto text-slate-200 shadow-sm">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-600">Global Search</p>
                <p className="text-sm text-slate-400">Find any project by PID, Customer Name or Request ID</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tighter pt-4">
                <span className="px-2 py-1 bg-white rounded-lg shadow-sm border border-slate-100">ESC</span> to close
                <span className="mx-2">•</span>
                <span className="px-2 py-1 bg-white rounded-lg shadow-sm border border-slate-100">⌘ K</span> to open
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 md:px-3 md:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white flex items-center gap-2 group border border-white/5"
        title="Search PID (⌘K)"
      >
        <Search className="w-4 h-4 md:w-3.5 md:h-3.5 group-hover:scale-110 transition-transform" />
        <span className="hidden md:inline text-xs font-medium opacity-80 group-hover:opacity-100">Search PID</span>
        <kbd className="hidden lg:flex h-4 items-center gap-1 rounded bg-white/10 px-1.5 font-mono text-[9px] font-medium text-white/50 border border-white/10">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </button>

      {isOpen && createPortal(searchOverlay, document.body)}
    </>
  );
}
