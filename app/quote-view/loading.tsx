import { Loader2 } from "lucide-react";

export default function QuoteViewLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading secure document...</p>
      </div>
    </div>
  );
}
