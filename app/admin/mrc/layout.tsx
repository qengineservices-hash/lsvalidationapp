import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Library, CloudUpload } from "lucide-react";

export default async function MRCLayout({ children }: { children: ReactNode }) {
  // We'll let the existing AuthShell handle the primary auth redirection 
  // to ensure consistency with the rest of the application's client-side state.
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link 
                href="/admin" 
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-all duration-200 hover:-translate-x-1"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                MRC Center
              </h1>
              <nav className="hidden md:flex space-x-2">
                <Link 
                  href="/admin/mrc" 
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <Library className="w-4 h-4" />
                  <span>Categories</span>
                </Link>
                <Link 
                  href="/admin/mrc/bulk-upload" 
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Bulk Import</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
