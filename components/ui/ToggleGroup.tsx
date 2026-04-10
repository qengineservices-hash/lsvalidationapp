"use client";

import { cn } from "@/lib/utils";

interface ToggleGroupProps {
  value: string;
  onChange: (val: "Yes" | "No" | "NA") => void;
}

export default function ToggleGroup({ value, onChange }: ToggleGroupProps) {
  const options: Array<{ label: string; val: "Yes" | "No" | "NA"; activeClass: string }> = [
    { label: "Yes", val: "Yes", activeClass: "bg-green-500 text-white border-green-500" },
    { label: "No", val: "No", activeClass: "bg-red-500 text-white border-red-500" },
    { label: "NA", val: "NA", activeClass: "bg-gray-500 text-white border-gray-500" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={cn(
            "px-4 py-1.5 rounded-lg border text-xs font-bold transition-all",
            value === opt.val
              ? opt.activeClass
              : "bg-white text-livspace-gray-600 border-livspace-gray-200 hover:border-gray-400"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
