"use client";

import { useValidationStore } from "@/stores/useValidationStore";
import { useRouter } from "next/navigation";
import { ChevronRight, Home, Building2, MapPin, Hash, User } from "lucide-react";

export default function PreliminaryDetailsStep() {
  const { formData, updateProject, setStep } = useValidationStore();
  const router = useRouter();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(1); // Move to Society Constraints
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-livspace-dark">Project Information</h2>
        <p className="text-livspace-gray-600">Enter the basic site and customer details to begin validation.</p>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PID */}
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="label-livspace">Project ID (PID)</label>
            <div className="relative">
              <Hash className="absolute left-3 top-3.5 h-4 w-4 text-livspace-gray-400" />
              <input
                type="text"
                maxLength={15}
                required
                placeholder="1234567890"
                value={formData.project.pid}
                onChange={(e) => updateProject({ pid: e.target.value.replace(/\D/g, '') })}
                className="w-full border border-livspace-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
              />
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="label-livspace">Customer Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-livspace-gray-400" />
              <input
                type="text"
                required
                placeholder="Aditi Sharma"
                value={formData.project.customerName}
                onChange={(e) => updateProject({ customerName: e.target.value })}
                className="w-full border border-livspace-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-2 col-span-2">
            <label className="label-livspace">City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-livspace-gray-400" />
              <select
                required
                value={formData.project.city}
                onChange={(e) => updateProject({ city: e.target.value })}
                className="w-full border border-livspace-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all appearance-none bg-white"
              >
                <option value="">Select City</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>
          </div>

          {/* Society Name */}
          <div className="space-y-2 col-span-2">
            <label className="label-livspace">Society Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-livspace-gray-400" />
              <input
                type="text"
                required
                placeholder="Prestige Falcon City"
                value={formData.project.society}
                onChange={(e) => updateProject({ society: e.target.value })}
                className="w-full border border-livspace-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
              />
            </div>
          </div>

          {/* Flat & Floor */}
          <div className="space-y-2 col-span-1">
            <label className="label-livspace">Flat No</label>
            <input
              type="text"
              required
              placeholder="B-402"
              value={formData.project.flat}
              onChange={(e) => updateProject({ flat: e.target.value })}
              className="w-full border border-livspace-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
            />
          </div>
          <div className="space-y-2 col-span-1">
            <label className="label-livspace">Floor No</label>
            <input
              type="text"
              required
              placeholder="4th"
              value={formData.project.floorNo}
              onChange={(e) => updateProject({ floorNo: e.target.value })}
              className="w-full border border-livspace-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
            />
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            className="w-full btn-primary h-14 text-lg font-bold flex items-center justify-center gap-2 group shadow-lg shadow-livspace-orange/20"
          >
            Continue to Society Constraints
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
}
