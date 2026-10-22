"use client";

import { useToastStore } from "@/stores/useToastStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function Toast() {
  const { message, type, isVisible, hideToast } = useToastStore();
  const [render, setRender] = useState(false);

  // Smooth unmount
  useEffect(() => {
    if (isVisible) setRender(true);
    else {
      const t = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [isVisible]);

  if (!render) return null;

  return (
    <div
      className={cn(
        "fixed z-[100] transition-all duration-300 ease-out transform shadow-lg rounded-xl border flex items-center p-4 max-w-sm w-[90vw] sm:w-[380px]",
        // Position: Bottom-center on mobile, Top-right on desktop
        "bottom-20 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-20 sm:left-auto sm:right-6 sm:translate-x-0",
        // Visibility animations
        isVisible
          ? "opacity-100 translate-y-0 sm:translate-y-0"
          : "opacity-0 translate-y-8 sm:translate-y-[-10px]",
        // Type styles
        type === "success" && "bg-white border-green-200 text-slate-800",
        type === "error" && "bg-white border-red-200 text-slate-800",
        type === "info" && "bg-white border-blue-200 text-slate-800"
      )}
    >
      <div className="flex-shrink-0 mr-3">
        {type === "success" && <CheckCircle2 className="w-6 h-6 text-green-500" />}
        {type === "error" && <AlertCircle className="w-6 h-6 text-red-500" />}
        {type === "info" && <Info className="w-6 h-6 text-blue-500" />}
      </div>
      <div className="flex-1 mr-2 text-sm font-medium leading-snug">
        {message}
      </div>
      <button
        onClick={hideToast}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100 touch-target"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
