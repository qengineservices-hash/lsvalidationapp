"use client";

import {
  useValidationStore,
  SOCIETY_QUESTIONS,
} from "@/stores/useValidationStore";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SocietyConstraintsSection() {
  const { formData, updateSociety, setRoomsFromBhk } = useValidationStore();

  const handleBhkChange = (bhk: string) => {
    updateSociety("bhk", bhk);
    if (confirm(`Do you want to auto-configure room tabs based on ${bhk}? This will map standard rooms to your layout.`)) {
      setRoomsFromBhk(bhk);
    }
  };

  // Group by category
  const grouped: Record<string, typeof SOCIETY_QUESTIONS> = {};
  SOCIETY_QUESTIONS.forEach((q) => {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category].push(q);
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-livspace-dark">Society Constraints</h3>
        <p className="text-xs text-livspace-gray-400">These details help calculate soft costs and logistics.</p>
      </div>

      {Object.entries(grouped).map(([category, questions]) => (
        <div key={category} className="space-y-4">
          <h4 className="text-sm font-bold text-livspace-blue uppercase tracking-wider border-b border-livspace-gray-200 pb-2">
            {category}
          </h4>

          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.key} className="space-y-2">
                <label className="text-sm font-semibold text-livspace-gray-800">
                  {q.label}
                </label>

                {q.type === "mcq" && (
                  <div className="flex flex-wrap gap-2">
                    {q.options!.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (q.key === "bhk") {
                            handleBhkChange(opt);
                          } else {
                            updateSociety(q.key, opt);
                          }
                        }}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                          formData.society[q.key] === opt
                            ? "bg-livspace-blue text-white border-livspace-blue"
                            : "bg-white text-livspace-gray-600 border-livspace-gray-200 hover:border-livspace-blue"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "text" && (
                  <input
                    type="text"
                    value={formData.society[q.key] || ""}
                    onChange={(e) => updateSociety(q.key, e.target.value)}
                    className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange transition-all"
                  />
                )}

                {q.type === "textarea" && (
                  <textarea
                    value={formData.society[q.key] || ""}
                    onChange={(e) => updateSociety(q.key, e.target.value)}
                    rows={3}
                    className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange transition-all resize-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
