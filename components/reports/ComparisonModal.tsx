"use client";

import { X, ArrowRight, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WALL_QUESTIONS, ROOM_QUESTIONS, MEASUREMENT_FIELDS, SOCIETY_QUESTIONS } from "@/stores/useValidationStore";

interface ComparisonModalProps {
  v1: any;
  v2: any;
  v1Label: string;
  v2Label: string;
  onClose: () => void;
}

export default function ComparisonModal({ v1, v2, v1Label, v2Label, onClose }: ComparisonModalProps) {
  if (!v1 || !v2) return null;

  const getDiffs = () => {
    const diffs: { section: string; field: string; val1: string; val2: string; type: "change" | "add" | "remove" }[] = [];

    // 1. Work Environment
    SOCIETY_QUESTIONS.forEach(q => {
      const s1 = v1.society?.[q.key] || "—";
      const s2 = v2.society?.[q.key] || "—";
      if (s1 !== s2) {
        diffs.push({ section: "Work Environment", field: q.label, val1: s1, val2: s2, type: "change" });
      }
    });

    // 2. Room Order (Adds/Removes)
    const rooms1 = v1.roomOrder || [];
    const rooms2 = v2.roomOrder || [];
    rooms2.forEach(r => {
      if (!rooms1.includes(r)) {
        diffs.push({ section: "Rooms", field: r, val1: "Not Present", val2: "Added", type: "add" });
      }
    });
    rooms1.forEach(r => {
      if (!rooms2.includes(r)) {
        diffs.push({ section: "Rooms", field: r, val1: "Present", val2: "Removed", type: "remove" });
      }
    });

    // 3. Detailed Room Content (for overlapping rooms)
    const commonRooms = rooms1.filter((r: string) => rooms2.includes(r));
    commonRooms.forEach((rName: string) => {
      const r1 = v1.rooms?.[rName];
      const r2 = v2.rooms?.[rName];

      // Wall Questions
      WALL_QUESTIONS.forEach(q => {
        const a1 = r1?.wallAnswers?.[q]?.value || "—";
        const a2 = r2?.wallAnswers?.[q]?.value || "—";
        if (a1 !== a2) {
          diffs.push({ section: rName, field: `Wall: ${q}`, val1: a1, val2: a2, type: "change" });
        }
      });

      // Room Questions
      ROOM_QUESTIONS.forEach(q => {
        const a1 = r1?.roomAnswers?.[q]?.value || "—";
        const a2 = r2?.roomAnswers?.[q]?.value || "—";
        if (a1 !== a2) {
          diffs.push({ section: rName, field: `Question: ${q}`, val1: a1, val2: a2, type: "change" });
        }
      });

      // Measurements
      MEASUREMENT_FIELDS.forEach(f => {
        const m1 = r1?.measurements?.[f.key] || "—";
        const m2 = r2?.measurements?.[f.key] || "—";
        if (m1.toString() !== m2.toString()) {
          diffs.push({ section: rName, field: f.label, val1: m1.toString(), val2: m2.toString(), type: "change" });
        }
      });
    });

    return diffs;
  };

  const diffList = getDiffs();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-livspace-gray-100 flex items-center justify-between bg-livspace-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-livspace-dark flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-livspace-blue" />
              Version Comparison
            </h2>
            <p className="text-sm text-livspace-gray-500 mt-1">Comparing {v1Label} with {v2Label}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-livspace-gray-200 rounded-full transition-colors text-livspace-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {diffList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-green-500" />
               </div>
               <h3 className="text-lg font-bold text-livspace-dark">No Changes Detected</h3>
               <p className="text-sm text-livspace-gray-500 max-w-xs mt-2">The data in both versions is identical across all categories.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 text-[10px] font-black uppercase tracking-widest text-livspace-gray-400 px-4">
                <div className="col-span-1">Section / Field</div>
                <div className="col-span-1">{v1Label}</div>
                <div className="col-span-1"></div>
                <div className="col-span-1">{v2Label}</div>
              </div>

              {diffList.map((diff, i) => (
                <div key={i} className="group grid grid-cols-4 items-center gap-4 p-4 bg-white border border-livspace-gray-100 rounded-2xl hover:border-livspace-blue hover:shadow-md transition-all">
                  <div className="col-span-1">
                    <p className="text-[10px] font-bold text-livspace-gray-400 uppercase">{diff.section}</p>
                    <p className="text-xs font-bold text-livspace-dark mt-0.5">{diff.field}</p>
                  </div>
                  <div className="col-span-1 bg-red-50 p-2 rounded-lg border border-red-100">
                    <p className="text-sm text-red-700 font-medium line-through decoration-red-300 opacity-70">{diff.val1}</p>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-livspace-gray-300" />
                  </div>
                  <div className={cn(
                    "col-span-1 p-2 rounded-lg border",
                    diff.type === "add" ? "bg-green-50 border-green-100 text-green-700" : 
                    diff.type === "remove" ? "bg-red-50 border-red-100 text-red-700" :
                    "bg-blue-50 border-blue-100 text-blue-700"
                  )}>
                    <p className="text-sm font-bold">{diff.val2}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-livspace-gray-100 bg-livspace-gray-50/50 text-right">
          <button onClick={onClose} className="px-6 py-2 bg-livspace-dark text-white rounded-xl font-bold text-sm tracking-wide">
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
