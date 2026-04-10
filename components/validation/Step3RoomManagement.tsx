"use client";

import { useState } from "react";
import { useValidationStore } from "@/stores/useValidationStore";
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Ruler, 
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { checkDiagonalVariance, checkCeilingVariation } from "@/lib/business-logic/rules";

const measurementFields = [
  { label: "FC - Corner 1", key: "fc1", group: "Ceiling" },
  { label: "FC - Corner 2", key: "fc2", group: "Ceiling" },
  { label: "FC - Corner 3", key: "fc3", group: "Ceiling" },
  { label: "FC - Corner 4", key: "fc4", group: "Ceiling" },
  { label: "FC - Center", key: "fc5", group: "Ceiling" },
  { label: "Diagonal 1", key: "diag1", group: "Diagonals" },
  { label: "Diagonal 2", key: "diag2", group: "Diagonals" },
];

export default function RoomManagementStep() {
  const { formData, addRoom, updateRoomMeasurements, setStep } = useValidationStore();
  const [newRoomName, setNewRoomName] = useState("");
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      addRoom(newRoomName.trim());
      setNewRoomName("");
    }
  };

  const getRoomIssues = (room: any) => {
    const issues = [];
    const diagIssue = checkDiagonalVariance(
      Number(room.measurements.diag1), 
      Number(room.measurements.diag2)
    );
    if (diagIssue) issues.push(diagIssue);

    const ceilingIssue = checkCeilingVariation([
      Number(room.measurements.fc1),
      Number(room.measurements.fc2),
      Number(room.measurements.fc3),
      Number(room.measurements.fc4),
      Number(room.measurements.fc5),
    ]);
    if (ceilingIssue) issues.push(ceilingIssue);

    return issues;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-livspace-dark">Room Management</h2>
          <p className="text-livspace-gray-600">Add rooms and capture detailed measurements for each.</p>
        </div>
        
        <form onSubmit={handleAddRoom} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="e.g. Master Bedroom"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="flex-1 border border-livspace-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-livspace-orange transition-all"
          />
          <button 
            type="submit"
            className="bg-livspace-dark text-white p-2 rounded-xl hover:bg-black transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {formData.rooms.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-livspace-gray-200 rounded-3xl space-y-3">
            <Ruler className="w-12 h-12 text-livspace-gray-300 mx-auto" />
            <p className="text-livspace-gray-500 font-medium">No rooms added yet. Start by adding one above.</p>
          </div>
        ) : (
          formData.rooms.map((room) => {
            const issues = getRoomIssues(room);
            const isExpanded = expandedRoom === room.id;

            return (
              <div 
                key={room.id}
                className={cn(
                  "bg-white border transition-all duration-300 rounded-2xl overflow-hidden",
                  isExpanded ? "border-livspace-orange ring-1 ring-livspace-orange/20 shadow-lg" : "border-livspace-gray-200"
                )}
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-livspace-gray-100 rounded-xl flex items-center justify-center">
                      <Ruler className="w-5 h-5 text-livspace-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-livspace-dark">{room.name}</h3>
                      <p className="text-xs text-livspace-gray-400">
                        {Object.keys(room.measurements).length} measurements captured
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {issues.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 text-livspace-error px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <Info className="w-3 h-3" />
                        {issues.length} Alert{issues.length > 1 ? 's' : ''}
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-livspace-gray-400" /> : <ChevronDown className="w-5 h-5 text-livspace-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-livspace-gray-50 space-y-6 animate-in slide-in-from-top-2">
                    {/* Measurements Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                      {measurementFields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                            {field.label}
                          </label>
                          <input
                            type="number"
                            placeholder="mm"
                            value={room.measurements[field.key] || ""}
                            onChange={(e) => updateRoomMeasurements(room.id, field.key, e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange transition-all"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Logic Alerts */}
                    {issues.length > 0 && (
                      <div className="space-y-2">
                        {issues.map((issue, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-livspace-error">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="leading-relaxed font-medium">{issue}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-4 pt-6">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex-1 h-14 rounded-xl border border-livspace-gray-200 font-bold text-livspace-gray-600 flex items-center justify-center gap-2 hover:bg-livspace-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={() => setStep(3)} // Move to Photo Step
          className="flex-[2] btn-primary h-14 text-lg font-bold flex items-center justify-center gap-2 group shadow-lg shadow-livspace-orange/20"
        >
          Continue to Photographs
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
