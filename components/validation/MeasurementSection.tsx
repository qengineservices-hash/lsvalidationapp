"use client";

import {
  useValidationStore,
  MEASUREMENT_FIELDS,
} from "@/stores/useValidationStore";
import { checkDiagonalVariance, checkCeilingVariation, checkACConstraint } from "@/lib/business-logic/rules";
import { AlertTriangle } from "lucide-react";

interface MeasurementSectionProps {
  room: string;
}

export default function MeasurementSection({ room }: MeasurementSectionProps) {
  const { formData, setMeasurement } = useValidationStore();
  const roomData = formData.rooms[room];
  if (!roomData) return null;

  const m = roomData.measurements;

  // Group fields
  const grouped: Record<string, typeof MEASUREMENT_FIELDS> = {};
  MEASUREMENT_FIELDS.forEach((f) => {
    if (!grouped[f.group]) grouped[f.group] = [];
    grouped[f.group].push(f);
  });

  // Run business logic checks
  const alerts: string[] = [];

  const diagAlert = checkDiagonalVariance(Number(m.diag1) || 0, Number(m.diag2) || 0);
  if (diagAlert) alerts.push(diagAlert);

  const ceilingAlert = checkCeilingVariation([
    Number(m.fc1) || 0, Number(m.fc2) || 0, Number(m.fc3) || 0,
    Number(m.fc4) || 0, Number(m.fc5) || 0,
  ]);
  if (ceilingAlert) alerts.push(ceilingAlert);

  const acAlert = checkACConstraint([
    { wall: "NW", value: Number(m.soffitNW) || 0 },
    { wall: "EW", value: Number(m.soffitEW) || 0 },
    { wall: "SW", value: Number(m.soffitSW) || 0 },
    { wall: "WW", value: Number(m.soffitWW) || 0 },
  ]);
  if (acAlert) alerts.push(acAlert);

  const filledCount = MEASUREMENT_FIELDS.filter((f) => m[f.key] !== undefined && m[f.key] !== "").length;

  return (
    <div className="space-y-6">
      <span className="text-xs text-livspace-gray-400 font-medium">
        {filledCount}/{MEASUREMENT_FIELDS.length} captured
      </span>

      {/* Alerts from rule engine */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p className="leading-relaxed font-medium">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Measurement groups */}
      {Object.entries(grouped).map(([group, fields]) => (
        <div key={group} className="space-y-3">
          <h4 className="text-xs font-bold text-livspace-blue uppercase tracking-wider">
            {group}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500 block">
                  {field.label}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="mm"
                  value={m[field.key] ?? ""}
                  onChange={(e) =>
                    setMeasurement(
                      room,
                      field.key,
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
