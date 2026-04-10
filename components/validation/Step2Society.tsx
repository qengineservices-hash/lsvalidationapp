"use client";

import { useValidationStore } from "@/stores/useValidationStore";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

const societyQuestions = [
  { key: "propertyType", label: "What is the type of property?", options: ["Bare Shell", "Property < 15 yrs", "Property > 15 yrs"] },
  { key: "serviceLift", label: "Service lift usage allowed?", options: ["Yes, Heavy allowed", "Yes, No Heavy", "No"] },
  { key: "loadingArea", label: "Debris loading area?", options: ["Within 30 ft", "More than 30 ft", "Not present"] },
  { key: "demolition", label: "Demolition allowed?", options: ["Mechanical", "Manual", "Both"] },
  { key: "waterSupply", label: "Active water supply point?", type: "yes_no" },
  { key: "powerSupply", label: "Active power supply?", type: "yes_no" },
  { key: "nocRequired", label: "NOC required for modifications?", type: "yes_no" },
];

export default function SocietyConstraintsStep() {
  const { formData, updateSociety, setStep } = useValidationStore();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2); // Move to Room Management
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-livspace-dark">Society Constraints</h2>
        <p className="text-livspace-gray-600">These details help calculate soft costs and logistical charges.</p>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        <div className="space-y-6 bg-white border border-livspace-gray-200 rounded-2xl p-6 shadow-sm">
          {societyQuestions.map((q) => (
            <div key={q.key} className="space-y-3 pb-6 border-b border-livspace-gray-100 last:border-0 last:pb-0">
              <label className="text-sm font-semibold text-livspace-gray-800 flex items-center gap-2">
                {q.label}
                <HelpCircle className="w-3.5 h-3.5 text-livspace-gray-400" />
              </label>

              {q.type === "yes_no" ? (
                <div className="flex gap-4">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateSociety(q.key, opt)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                        formData.society[q.key] === opt
                          ? "bg-livspace-blue text-white border-livspace-blue shadow-md"
                          : "bg-white text-livspace-gray-600 border-livspace-gray-200 hover:border-livspace-blue"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {q.options?.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateSociety(q.key, opt)}
                      className={`py-3 px-3 rounded-xl border text-xs font-medium transition-all ${
                        formData.society[q.key] === opt
                          ? "bg-livspace-blue text-white border-livspace-blue shadow-md"
                          : "bg-white text-livspace-gray-600 border-livspace-gray-200 hover:border-livspace-blue"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex-1 h-14 rounded-xl border border-livspace-gray-200 font-bold text-livspace-gray-600 flex items-center justify-center gap-2 hover:bg-livspace-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <button
            type="submit"
            className="flex-[2] btn-primary h-14 text-lg font-bold flex items-center justify-center gap-2 group shadow-lg shadow-livspace-orange/20"
          >
            Continue to Rooms
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
}
