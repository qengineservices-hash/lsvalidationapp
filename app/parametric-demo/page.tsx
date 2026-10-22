"use client";

import React, { useState, useMemo } from "react";
import { 
  calculateQuote, 
  RoomParams, 
  GlobalParams, 
  BOMItem,
  BusinessRules,
  DEFAULT_BUSINESS_RULES
} from "@/lib/parametric_rules";
import { 
  Building2, 
  Paintbrush, 
  Layers, 
  Zap, 
  Layers3, 
  AlertTriangle, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Check, 
  Info, 
  CheckCircle,
  Eye,
  Sliders,
  DollarSign,
  X,
  Settings,
  HelpCircle
} from "lucide-react";

export default function ParametricDemoPage() {
  // 1. STATE MANAGEMENT
  const [globalParams, setGlobalParams] = useState<GlobalParams>({
    city: "Bangalore",
    floorNumber: 3,
    liftAvailable: true,
    workingHoursRestricted: false,
    waterAvailable: true,
    powerAvailable: true,
    nocRequired: false,
    debrisRemovalByVendor: false,
    vehicleEntryRestricted: false,
    societyWorkingHours: 8
  });

  const [rooms, setRooms] = useState<RoomParams[]>([
    {
      id: "room-1",
      name: "Master Bedroom",
      length: 12,
      width: 10,
      height: 10,
      
      paintingEnabled: true,
      wallCondition: "smooth",
      paintQuality: "royale",
      applicablePaintArea: "walls_ceiling",
      doorDeductionsList: [{ length: 7, width: 3 }],
      windowDeductionsList: [{ length: 4, width: 4 }],
      wardrobeDeductionsList: [{ length: 7, width: 5 }],
      includeWoodworkEnamel: false,
      woodworkEnamelArea: 0,
      
      workingHeightMultiplier: 1,
      wallpaperAddon: { enabled: false, sku: "SKU-PNT-WALLPAPER", walls: [], customArea: 0 },
      textureAddon: { enabled: false, walls: [], customArea: 0 },
      enamelAddon: { enabled: false, customArea: 0 },
      multiColorAddon: { enabled: false, walls: [], customArea: 0 },
      paintableTrims: { enabled: false, rft: 0 },
      groovesPainting: { enabled: false, rft: 0 },
      darkShadeWalls: [],

      fcEnabled: true,
      fcType: "peripheral",
      fcWidth: 2,
      fcMaterial: "standard_gypsum",
      fcElectricalIncluded: true,
      lightsSuppliedByUs: false,
      fcCoveEnabled: true,
      fcGalaCutouts: 4,
      fcCurtainPelmetLength: 10,
      fcCurvedDesignLength: 0,
      fcAddOns: [],

      electricalEnabled: true,
      electricalPackage: "none",
      newPrimaryPoints: 6,
      newSecondaryPoints: 4,
      wallPrimaryPoints: 2,
      wallSecondaryPoints: 0,
      relocationsCount: 1,
      acPointsCount: 1,
      conduitLayingLength: 20,
      wallType: "brick",
      electricalAddOns: ["Fan Fixing"],

      plumbingEnabled: false,
      plumbingPackage: "none",
      internalPlumbingLine: "none",
      plumbingWaterproofing: false,
      wcType: "none",
      washBasinsCount: 0,
      tapsCount: 0,
      geysersCount: 0,
      kitchenSinksCount: 0,
      plumbingAddOns: []
    },
    {
      id: "room-2",
      name: "Guest Bathroom",
      length: 8,
      width: 6,
      height: 9,
      
      paintingEnabled: false,
      wallCondition: "smooth",
      paintQuality: "tractor",
      applicablePaintArea: "walls",
      doorDeductionsList: [{ length: 7, width: 3 }],
      windowDeductionsList: [],
      wardrobeDeductionsList: [],
      includeWoodworkEnamel: false,
      woodworkEnamelArea: 0,
      
      workingHeightMultiplier: 1,
      wallpaperAddon: { enabled: false, sku: "SKU-PNT-WALLPAPER", walls: [], customArea: 0 },
      textureAddon: { enabled: false, walls: [], customArea: 0 },
      enamelAddon: { enabled: false, customArea: 0 },
      multiColorAddon: { enabled: false, walls: [], customArea: 0 },
      paintableTrims: { enabled: false, rft: 0 },
      groovesPainting: { enabled: false, rft: 0 },
      darkShadeWalls: [],

      fcEnabled: false,
      fcType: "none",
      fcWidth: 1.5,
      fcMaterial: "standard_gypsum",
      fcElectricalIncluded: false,
      lightsSuppliedByUs: false,
      fcCoveEnabled: false,
      fcGalaCutouts: 0,
      fcCurtainPelmetLength: 0,
      fcCurvedDesignLength: 0,
      fcAddOns: [],

      electricalEnabled: false,
      electricalPackage: "none",
      newPrimaryPoints: 0,
      newSecondaryPoints: 0,
      wallPrimaryPoints: 0,
      wallSecondaryPoints: 0,
      relocationsCount: 0,
      acPointsCount: 0,
      conduitLayingLength: 0,
      wallType: "brick",
      electricalAddOns: [],

      plumbingEnabled: true,
      plumbingPackage: "toilet_pkg",
      internalPlumbingLine: "cold_hot",
      plumbingWaterproofing: true,
      wcType: "wall",
      washBasinsCount: 1,
      tapsCount: 2,
      geysersCount: 1,
      kitchenSinksCount: 0,
      plumbingAddOns: ["Mixer Installation"]
    }
  ]);

  const [activeRoomId, setActiveRoomId] = useState<string>("room-1");
  const [activeTab, setActiveTab] = useState<"site" | "painting" | "fc" | "electrical" | "plumbing">("painting");
  
  // Toggle between visual playground and business rules manager
  const [viewMode, setViewMode] = useState<"playground" | "rules">("playground");

  // Dynamic business rules state loaded with standard defaults
  const [businessRules, setBusinessRules] = useState<BusinessRules>({
    ...DEFAULT_BUSINESS_RULES
  });

  // 2. CALCULATION LOOP WITH ACTIVE BUSINESS RULES
  const calculationResult = useMemo(() => {
    return calculateQuote(rooms, globalParams, businessRules);
  }, [rooms, globalParams, businessRules]);

  const activeRoom = useMemo(() => {
    return rooms.find(r => r.id === activeRoomId) || rooms[0];
  }, [rooms, activeRoomId]);

  // 3. EVENT HANDLERS
  const updateActiveRoom = (updates: Partial<RoomParams>) => {
    setRooms(prev => prev.map(room => {
      if (room.id === activeRoomId) {
        return { ...room, ...updates };
      }
      return room;
    }));
  };

  const handleAddRoom = () => {
    const newId = `room-${Date.now()}`;
    const newRoom: RoomParams = {
      id: newId,
      name: `Room ${rooms.length + 1}`,
      length: 10,
      width: 10,
      height: 10,
      paintingEnabled: true,
      wallCondition: "smooth",
      paintQuality: "tractor",
      applicablePaintArea: "walls_ceiling",
      doorDeductionsList: [{ length: 7, width: 3 }],
      windowDeductionsList: [{ length: 4, width: 4 }],
      wardrobeDeductionsList: [],
      includeWoodworkEnamel: false,
      woodworkEnamelArea: 0,
      
      workingHeightMultiplier: 1,
      wallpaperAddon: { enabled: false, sku: "SKU-PNT-WALLPAPER", walls: [], customArea: 0 },
      textureAddon: { enabled: false, walls: [], customArea: 0 },
      enamelAddon: { enabled: false, customArea: 0 },
      multiColorAddon: { enabled: false, walls: [], customArea: 0 },
      paintableTrims: { enabled: false, rft: 0 },
      groovesPainting: { enabled: false, rft: 0 },
      darkShadeWalls: [],
      fcEnabled: false,
      fcType: "none",
      fcWidth: 1.5,
      fcMaterial: "standard_gypsum",
      fcElectricalIncluded: false,
      lightsSuppliedByUs: false,
      fcCoveEnabled: false,
      fcGalaCutouts: 0,
      fcCurtainPelmetLength: 0,
      fcCurvedDesignLength: 0,
      fcAddOns: [],
      electricalEnabled: false,
      electricalPackage: "none",
      newPrimaryPoints: 0,
      newSecondaryPoints: 0,
      wallPrimaryPoints: 0,
      wallSecondaryPoints: 0,
      relocationsCount: 0,
      acPointsCount: 0,
      conduitLayingLength: 0,
      wallType: "brick",
      electricalAddOns: [],
      plumbingEnabled: false,
      plumbingPackage: "none",
      internalPlumbingLine: "none",
      plumbingWaterproofing: false,
      wcType: "none",
      washBasinsCount: 0,
      tapsCount: 0,
      geysersCount: 0,
      kitchenSinksCount: 0,
      plumbingAddOns: []
    };
    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(newId);
  };

  const handleDeleteRoom = (id: string) => {
    if (rooms.length <= 1) return;
    setRooms(prev => prev.filter(r => r.id !== id));
    setActiveRoomId(prevId => prevId === id ? rooms.find(r => r.id !== id)!.id : prevId);
  };



  // Derive paint scope display based on current rules & condition
  const derivedScopeText = useMemo(() => {
    const scope = businessRules.conditionScopeMap[activeRoom.wallCondition] || "repaint";
    return scope === "fresh" 
      ? "Fresh Painting (2 coats Putty + 1 coat Primer + 2 coats Paint)"
      : "Repainting (1 coat Primer + 2 coats Paint)";
  }, [activeRoom.wallCondition, businessRules.conditionScopeMap]);

  // Removed: SVG Blueprint visuals (roomVisuals hook removed for clarity)

  // List of cities from MRC
  const citiesList = [
    "Ahmedabad", "Bangalore", "Bhopal", "Chandigarh", "Chennai", 
    "Coimbatore", "Dehradun", "Delhi", "Goa", "Hyderabad", 
    "Jaipur", "Kolkata", "Lucknow", "Mumbai", "Mysore", 
    "Nagpur", "Nashik", "Navi Mumbai/Thane", "NCR", "Patna", 
    "Pune", "Raipur", "Ranchi", "Surat", "Vadodara", "Varanasi"
  ];

  return (
    <div className="flex-1 bg-slate-50 text-slate-800 flex flex-col p-4 md:p-6 overflow-x-hidden min-h-screen">
      
      {/* HEADER SECTION - Clean, light white header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-5 mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm shadow-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Parametric Matrix Quoting
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              LS Parametric Pricing Playground
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Dynamic derived quotation engine based on site conditions, design, and core material rules.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("playground")}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "playground" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Designer Playground
            </button>
            <button
              onClick={() => setViewMode("rules")}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "rules" 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-red-500" />
              Business Rules Manager
            </button>
          </div>
        </div>
      </div>

      {/* VIEW PANEL ROUTER */}
      {viewMode === "rules" ? (
        
        // =============================================================
        // BUSINESS RULES MANAGER SCREEN (Light, clean, slider-based form)
        // =============================================================
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm shadow-slate-100 mb-6 flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500" />
                Active Quoting & Derivation Rules Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust the thresholds, rates, and condition-to-scope map tables. Changes instantly calculate rates in the room quotes below.
              </p>
            </div>
            <button 
              onClick={() => setBusinessRules({ ...DEFAULT_BUSINESS_RULES })}
              className="text-xs text-red-600 font-bold border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Category 1: Painting Logic */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Paintbrush className="w-4 h-4 text-slate-600" />
                Painting Business Logic
              </h3>

              {/* Scope condition mappings */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Wall Condition to Paint Scope Mapping</span>
                
                {[
                  { key: "smooth", label: "Smooth Wall condition" },
                  { key: "chipped", label: "Chipped Plaster condition" },
                  { key: "undulated", label: "Undulated Wall condition" },
                  { key: "seepage", label: "Seepage / Dampness condition" }
                ].map(cond => (
                  <div key={cond.key} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{cond.label}</span>
                    <select
                      value={businessRules.conditionScopeMap[cond.key as any]}
                      onChange={(e) => {
                        const newMap = { ...businessRules.conditionScopeMap, [cond.key]: e.target.value };
                        setBusinessRules(p => ({ ...p, conditionScopeMap: newMap as any }));
                      }}
                      className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                    >
                      <option value="repaint">Repaint (Cheaper)</option>
                      <option value="fresh">Fresh Paint (Putty incl.)</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Painting MOQ */}
              <div className="flex flex-col gap-2 border-t border-slate-200/60 pt-3">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Painting MOQ Target</span>
                  <span>{businessRules.paintingMoqArea} SQFT</span>
                </div>
                <input 
                  type="range" 
                  min={100} 
                  max={1000} 
                  step={50}
                  value={businessRules.paintingMoqArea}
                  onChange={(e) => setBusinessRules(p => ({ ...p, paintingMoqArea: Number(e.target.value) }))}
                  className="accent-red-500 cursor-pointer w-full"
                />
              </div>

              {/* Treatment rates */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Waterproofing Rate</span>
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-1">₹</span>
                    <input 
                      type="number" 
                      value={businessRules.waterproofingRatePerSqft}
                      onChange={(e) => setBusinessRules(p => ({ ...p, waterproofingRatePerSqft: Number(e.target.value) }))}
                      className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold"
                    />
                    <span className="text-slate-400 ml-1">/sqft</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">POP Punning Rate</span>
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-1">₹</span>
                    <input 
                      type="number" 
                      value={businessRules.punningRatePerSqft}
                      onChange={(e) => setBusinessRules(p => ({ ...p, punningRatePerSqft: Number(e.target.value) }))}
                      className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold"
                    />
                    <span className="text-slate-400 ml-1">/sqft</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category 2: False Ceiling Logic */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-slate-600" />
                Ceiling Business Logic
              </h3>

              {/* Ceiling MOQ */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Ceiling MOQ Target</span>
                  <span>{businessRules.fcMoqArea} SQFT</span>
                </div>
                <input 
                  type="range" 
                  min={50} 
                  max={500} 
                  step={25}
                  value={businessRules.fcMoqArea}
                  onChange={(e) => setBusinessRules(p => ({ ...p, fcMoqArea: Number(e.target.value) }))}
                  className="accent-red-500 cursor-pointer w-full"
                />
              </div>

              {/* Cove light drop-in rate */}
              <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-3 text-xs">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Cove Lighting Surcharge (RFT)</span>
                <div className="flex items-center mt-1">
                  <span className="text-slate-400 mr-1">₹</span>
                  <input 
                    type="number" 
                    value={businessRules.coveRatePerRft}
                    onChange={(e) => setBusinessRules(p => ({ ...p, coveRatePerRft: Number(e.target.value) }))}
                    className="w-20 border border-slate-200 rounded px-2 py-1 text-slate-800 font-bold"
                  />
                  <span className="text-slate-400 ml-1">per running foot</span>
                </div>
              </div>

              {/* Pelmet & Curves rates */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Pelmet Rate (RFT)</span>
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-1">₹</span>
                    <input 
                      type="number" 
                      value={businessRules.pelmetRatePerRft}
                      onChange={(e) => setBusinessRules(p => ({ ...p, pelmetRatePerRft: Number(e.target.value) }))}
                      className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Curve Surcharge</span>
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-1">₹</span>
                    <input 
                      type="number" 
                      value={businessRules.curveSurchargePerRft}
                      onChange={(e) => setBusinessRules(p => ({ ...p, curveSurchargePerRft: Number(e.target.value) }))}
                      className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category 3: Electrical, Plumbing & Surcharges */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Zap className="w-4 h-4 text-slate-600" />
                MEP & Global Surcharges
              </h3>

              {/* Chiseling multiplier */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Concrete Wall Cutting Multiplier</span>
                  <span>{businessRules.concreteChiselMultiplier}x</span>
                </div>
                <input 
                  type="range" 
                  min={1.0} 
                  max={2.5} 
                  step={0.1}
                  value={businessRules.concreteChiselMultiplier}
                  onChange={(e) => setBusinessRules(p => ({ ...p, concreteChiselMultiplier: Number(e.target.value) }))}
                  className="accent-red-500 cursor-pointer w-full"
                />
              </div>

              {/* Wet area waterproofing */}
              <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-3">
                <span className="text-slate-600 font-medium">Toilet Wet Area Waterproofing</span>
                <div className="flex items-center">
                  <span className="text-slate-400 mr-1">₹</span>
                  <input 
                    type="number" 
                    value={businessRules.wetAreaWaterproofRate}
                    onChange={(e) => setBusinessRules(p => ({ ...p, wetAreaWaterproofRate: Number(e.target.value) }))}
                    className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold text-center"
                  />
                  <span className="text-slate-400 ml-1">/sqft</span>
                </div>
              </div>

              {/* Carrying penalty starting floor */}
              <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-3">
                <span className="text-slate-600 font-medium">No Lift Charge Starts Above Floor</span>
                <input 
                  type="number" 
                  value={businessRules.noLiftCarrySurchargeFloorStart}
                  onChange={(e) => setBusinessRules(p => ({ ...p, noLiftCarrySurchargeFloorStart: Number(e.target.value) }))}
                  className="w-12 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold text-center"
                  min={1}
                />
              </div>

              {/* Carrying charge per floor */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">No Lift Charge (Per Floor)</span>
                <div className="flex items-center">
                  <span className="text-slate-400 mr-1">₹</span>
                  <input 
                    type="number" 
                    value={businessRules.noLiftCarrySurchargePerFloor}
                    onChange={(e) => setBusinessRules(p => ({ ...p, noLiftCarrySurchargePerFloor: Number(e.target.value) }))}
                    className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold text-center"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Site Constraint Surcharges Section */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-4 mt-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              Site Constraint Surcharges
            </h3>
            <p className="text-[10px] text-slate-500 -mt-2">These flat surcharges are injected into the BOQ when the designer toggles site conditions in the left panel.</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { key: "waterTankerSurcharge", label: "Water Tanker Delivery" },
                { key: "generatorSurcharge", label: "Diesel Generator" },
                { key: "debrisRemovalSurcharge", label: "Debris Removal & Cartage" },
                { key: "vehicleEntryManualCarry", label: "Vehicle Entry Manual Carry" },
              ].map(item => (
                <div key={item.key} className="flex flex-col gap-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">{item.label}</span>
                  <div className="flex items-center">
                    <span className="text-slate-400 mr-1">₹</span>
                    <input 
                      type="number" 
                      value={(businessRules as any)[item.key]}
                      onChange={(e) => setBusinessRules(p => ({ ...p, [item.key]: Number(e.target.value) }))}
                      className="w-20 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 font-bold"
                    />
                    <span className="text-slate-400 ml-1">flat</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 3: SKU Catalog & Mappings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* SKU Catalog */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                SKU Catalog (Mock DB)
              </h3>
              <p className="text-[10px] text-slate-500 -mt-1">List of valid catalog items that parameters can map to.</p>
              <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 font-bold">
                    <tr>
                      <th className="p-2 border-b border-slate-200">SKU Code</th>
                      <th className="p-2 border-b border-slate-200">Item Name</th>
                      <th className="p-2 border-b border-slate-200 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessRules.catalog.map((cat, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="p-2 font-mono text-[9px] text-indigo-600">{cat.skuCode}</td>
                        <td className="p-2 text-slate-700 truncate max-w-[120px]" title={cat.itemName}>{cat.itemName}</td>
                        <td className="p-2 text-right text-slate-900 font-bold">₹{cat.unitRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SKU Mappings */}
            <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                Parametric-to-SKU Mappings
              </h3>
              <p className="text-[10px] text-slate-500 -mt-1">How 3-axis selections strictly derive a Catalog SKU.</p>
              <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 font-bold">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Category</th>
                      <th className="p-2 border-b border-slate-200">Condition (IF)</th>
                      <th className="p-2 border-b border-slate-200">Maps To (THEN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businessRules.skuMappings.map((map, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                        <td className="p-2 text-slate-600 uppercase font-bold text-[9px]">{map.category.replace('_', ' ')}</td>
                        <td className="p-2 text-slate-700 font-mono text-[9px]">
                          {Object.entries(map.conditions).map(([k, v]) => `${k}:${v}`).join(', ')}
                        </td>
                        <td className="p-2 font-mono text-[9px] text-emerald-600 font-bold">{map.mappedSkuCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 mt-2">
            <Info className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-800 leading-relaxed">
              <span className="font-bold">Workflow Rule Definition:</span> The layout components and calculation scripts read these parameters programmatically. For example, if you change the "Wall Condition to Paint Scope Mapping" for <span className="font-bold">Seepage</span> to "Repaint", the system will automatically stop generating a putty/fresh painting SKU when a seepage condition is detected. This separates developer code from business pricing strategy.
            </div>
          </div>
        </div>

      ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 mb-6">
          
          {/* LEFT COLUMN: Room selector + Project & Site Constraints */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Room pills bar */}
            <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-2xl shadow-sm shadow-slate-100">
              <div className="flex flex-wrap gap-2 items-center">
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoomId(room.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeRoomId === room.id 
                        ? "bg-slate-900 text-white shadow-sm" 
                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {room.name}
                    {rooms.length > 1 && (
                      <X 
                        className="w-3.5 h-3.5 hover:text-red-500 transition-colors ml-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleAddRoom}
                className="bg-red-50 text-red-600 border border-red-100 p-2 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center font-bold"
                title="Add new room"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Project & Site-Level Constraints Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 shadow-sm shadow-slate-100">
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-red-500" />
                Project & Site-Level Constraints
              </h2>

              {/* City & Floor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">City / Rate Zone</label>
                  <select 
                    value={globalParams.city} 
                    onChange={(e) => setGlobalParams(p => ({ ...p, city: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-red-500"
                  >
                    {citiesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Floor Number</label>
                  <input 
                    type="number" 
                    value={globalParams.floorNumber} 
                    onChange={(e) => setGlobalParams(p => ({ ...p, floorNumber: Number(e.target.value) }))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none text-center"
                    min={1}
                  />
                </div>
              </div>

              {/* Society Hours */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Society Working Hours / Day</label>
                <input 
                  type="number" 
                  value={globalParams.societyWorkingHours} 
                  onChange={(e) => setGlobalParams(p => ({ ...p, societyWorkingHours: Number(e.target.value) }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold focus:outline-none text-center"
                  min={1} max={12}
                />
              </div>

              {/* Toggle Constraints */}
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Site Availability & Logistics</span>
                
                {[
                  { key: "liftAvailable", label: "Service Lift Available", defaultOn: true },
                  { key: "waterAvailable", label: "Running Water on Site", defaultOn: true },
                  { key: "powerAvailable", label: "Electricity Available", defaultOn: true },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                    <input 
                      type="checkbox" 
                      checked={(globalParams as any)[item.key]} 
                      onChange={(e) => setGlobalParams(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="rounded border-slate-300 text-green-500 focus:ring-green-500 w-4 h-4"
                    />
                  </label>
                ))}

                {[
                  { key: "workingHoursRestricted", label: "Restricted Working Timings" },
                  { key: "nocRequired", label: "NOC Required from Society" },
                  { key: "debrisRemovalByVendor", label: "Debris Removal by Vendor" },
                  { key: "vehicleEntryRestricted", label: "Vehicle Entry Restricted" },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                    <input 
                      type="checkbox" 
                      checked={(globalParams as any)[item.key]} 
                      onChange={(e) => setGlobalParams(p => ({ ...p, [item.key]: e.target.checked }))}
                      className="rounded border-slate-300 text-red-500 focus:ring-red-500 w-4 h-4"
                    />
                  </label>
                ))}
              </div>

              {/* Active Surcharge Warnings */}
              {(!globalParams.waterAvailable || !globalParams.powerAvailable || globalParams.debrisRemovalByVendor || globalParams.vehicleEntryRestricted) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 font-semibold">
                  <span className="font-extrabold block mb-1">⚠ Active Site Surcharges:</span>
                  {!globalParams.waterAvailable && <span className="block">• Water Tanker Delivery — ₹{businessRules.waterTankerSurcharge.toLocaleString()}</span>}
                  {!globalParams.powerAvailable && <span className="block">• Generator Surcharge — ₹{businessRules.generatorSurcharge.toLocaleString()}</span>}
                  {globalParams.debrisRemovalByVendor && <span className="block">• Debris Removal — ₹{businessRules.debrisRemovalSurcharge.toLocaleString()}</span>}
                  {globalParams.vehicleEntryRestricted && <span className="block">• Vehicle Entry Carry — ₹{businessRules.vehicleEntryManualCarry.toLocaleString()}</span>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PARAMETERS FORMS (WHITE BG DESIGN SYSTEM) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 shadow-sm shadow-slate-100">
            
            {/* Tab navigation */}
            <div className="flex border-b border-slate-200 pb-2 overflow-x-auto gap-2">
              {[
                { id: "painting", label: "Painting", icon: Paintbrush, enabled: activeRoom.paintingEnabled, toggleKey: "paintingEnabled" },
                { id: "fc", label: "Ceiling", icon: Layers, enabled: activeRoom.fcEnabled, toggleKey: "fcEnabled" },
                { id: "electrical", label: "Electrical", icon: Zap, enabled: activeRoom.electricalEnabled, toggleKey: "electricalEnabled" },
                { id: "plumbing", label: "Plumbing", icon: Layers3, enabled: activeRoom.plumbingEnabled, toggleKey: "plumbingEnabled" },
                { id: "site", label: "Room Size", icon: Sliders, enabled: true }
              ].map(tab => (
                <div key={tab.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-1">
                  <button
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      activeTab === tab.id 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                  
                  {tab.toggleKey && (
                    <input
                      type="checkbox"
                      checked={tab.enabled}
                      onChange={(e) => updateActiveRoom({ [tab.toggleKey]: e.target.checked })}
                      className="rounded border-slate-300 text-red-500 focus:ring-red-500 w-3.5 h-3.5 mr-1 cursor-pointer"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* TAB PANELS */}
            <div className="flex-1 min-h-[350px] grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SITE CONFIG */}
              {activeTab === "site" && (
                <>
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">1</span>
                      Main Room Dimensions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Name</label>
                    <input 
                      type="text" 
                      value={activeRoom.name}
                      onChange={(e) => updateActiveRoom({ name: e.target.value })}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-red-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ceiling Height (Feet)</label>
                    <input 
                      type="number" 
                      value={activeRoom.height}
                      onChange={(e) => updateActiveRoom({ height: Number(e.target.value) })}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                      min={6}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Length (Feet)</label>
                    <input 
                      type="number" 
                      value={activeRoom.length}
                      onChange={(e) => updateActiveRoom({ length: Number(e.target.value) })}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                      min={4}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Width (Feet)</label>
                    <input 
                      type="number" 
                      value={activeRoom.width}
                      onChange={(e) => updateActiveRoom({ width: Number(e.target.value) })}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none"
                      min={4}
                    />
                  </div>
                  </div>
                  </div>
                </>
              )}

              {/* PAINTING - Restructured */}
              {activeTab === "painting" && (
                <>
                  {/* Main SKU Selection */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">1</span>
                      Main SKU Selection
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paint Quality</label>
                        <select 
                          value={activeRoom.paintQuality}
                          onChange={(e) => updateActiveRoom({ paintQuality: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                        >
                          <option value="tractor">Economy (Asian Tractor Emulsion)</option>
                          <option value="premium">Premium (Apcolite Emulsion)</option>
                          <option value="royale">Luxury (Royale Luxury Emulsion)</option>
                          <option value="texture">Texture (Texture Finish / Custom)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wall Surface</label>
                        <select 
                          value={activeRoom.wallCondition}
                          onChange={(e) => updateActiveRoom({ wallCondition: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-red-500"
                        >
                          <option value="smooth">Smooth (No cracks/peeling)</option>
                          <option value="chipped">Chipped Plaster / Crack repairs</option>
                          <option value="undulated">Uneven / Highly Undulated</option>
                          <option value="seepage">Severe Dampness & Seepage</option>
                          <option value="non_plastered">Non-Plastered (Requires Civil Work)</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paint Area</label>
                        <select 
                          value={activeRoom.applicablePaintArea}
                          onChange={(e) => updateActiveRoom({ applicablePaintArea: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                        >
                          <option value="walls_ceiling">Walls + Ceiling</option>
                          <option value="walls">Only Walls</option>
                          <option value="ceiling">Only Ceiling</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Working Height</label>
                        <select 
                          value={activeRoom.workingHeightMultiplier}
                          onChange={(e) => updateActiveRoom({ workingHeightMultiplier: Number(e.target.value) as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                        >
                          <option value={1}>1x Ceiling Height</option>
                          <option value={1.5}>1.5x Ceiling Height</option>
                          <option value={2}>2x Ceiling Height</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 mt-1.5 w-full">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <span className="font-extrabold text-blue-900 block mb-0.5">System Suggested Scope Model</span>
                        <span className="text-blue-800 font-medium">{derivedScopeText}</span>
                        {activeRoom.wallCondition !== "smooth" && (
                          <span className="block text-[10px] text-blue-600 font-bold mt-1">
                            * Auto-locked because '{activeRoom.wallCondition}' condition mandates structural preparation/putty coating.
                          </span>
                        )}
                        {activeRoom.wallCondition === 'non_plastered' && (
                           <span className="block text-[10px] text-amber-600 font-bold mt-1">
                            * Civil plastering SKU will be automatically added for structural readiness.
                          </span>
                        )}
                         {activeRoom.workingHeightMultiplier > 1 && (
                           <span className="block text-[10px] text-amber-600 font-bold mt-1">
                            * Scaffolding surcharge will be added based on the {activeRoom.workingHeightMultiplier}x height multiplier.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Area Deductions */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">2</span>
                      Area Deductions (L × W)
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Scope Area Deductions</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Doors */}
                        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                            <label className="text-[10px] text-slate-700 font-bold uppercase">Doors</label>
                            <button onClick={() => updateActiveRoom({ doorDeductionsList: [...activeRoom.doorDeductionsList, {length: 7, width: 3}] })} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm text-slate-600 hover:text-red-500 font-bold">+ Add</button>
                          </div>
                          <div className="flex flex-col gap-1.5 mt-1">
                            {activeRoom.doorDeductionsList.length === 0 ? <span className="text-[10px] text-slate-400 italic">No doors</span> : activeRoom.doorDeductionsList.map((item, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <input type="number" value={item.length} onChange={(e) => {
                                  const newList = [...activeRoom.doorDeductionsList];
                                  newList[i].length = Number(e.target.value);
                                  updateActiveRoom({ doorDeductionsList: newList });
                                }} className="w-full bg-white border border-slate-200 rounded text-center py-1 text-[10px] font-bold" placeholder="L" min={0} />
                                <span className="text-slate-300 text-[10px]">×</span>
                                <input type="number" value={item.width} onChange={(e) => {
                                  const newList = [...activeRoom.doorDeductionsList];
                                  newList[i].width = Number(e.target.value);
                                  updateActiveRoom({ doorDeductionsList: newList });
                                }} className="w-full bg-white border border-slate-200 rounded text-center py-1 text-[10px] font-bold" placeholder="W" min={0} />
                                <button onClick={() => {
                                  const newList = activeRoom.doorDeductionsList.filter((_, idx) => idx !== i);
                                  updateActiveRoom({ doorDeductionsList: newList });
                                }} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Windows */}
                        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                            <label className="text-[10px] text-slate-700 font-bold uppercase">Windows</label>
                            <button onClick={() => updateActiveRoom({ windowDeductionsList: [...activeRoom.windowDeductionsList, {length: 4, width: 4}] })} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm text-slate-600 hover:text-red-500 font-bold">+ Add</button>
                          </div>
                          <div className="flex flex-col gap-1.5 mt-1">
                            {activeRoom.windowDeductionsList.length === 0 ? <span className="text-[10px] text-slate-400 italic">No windows</span> : activeRoom.windowDeductionsList.map((item, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <input type="number" value={item.length} onChange={(e) => {
                                  const newList = [...activeRoom.windowDeductionsList];
                                  newList[i].length = Number(e.target.value);
                                  updateActiveRoom({ windowDeductionsList: newList });
                                }} className="w-full bg-white border border-slate-200 rounded text-center py-1 text-[10px] font-bold" placeholder="L" min={0} />
                                <span className="text-slate-300 text-[10px]">×</span>
                                <input type="number" value={item.width} onChange={(e) => {
                                  const newList = [...activeRoom.windowDeductionsList];
                                  newList[i].width = Number(e.target.value);
                                  updateActiveRoom({ windowDeductionsList: newList });
                                }} className="w-full bg-white border border-slate-200 rounded text-center py-1 text-[10px] font-bold" placeholder="W" min={0} />
                                <button onClick={() => {
                                  const newList = activeRoom.windowDeductionsList.filter((_, idx) => idx !== i);
                                  updateActiveRoom({ windowDeductionsList: newList });
                                }} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Wardrobes */}
                        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                            <label className="text-[10px] text-slate-700 font-bold uppercase">Wardrobes</label>
                            <button onClick={() => updateActiveRoom({ wardrobeDeductionsList: [...activeRoom.wardrobeDeductionsList, {length: 7, width: 5}] })} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm text-slate-600 hover:text-red-500 font-bold">+ Add</button>
                          </div>
                          <div className="flex flex-col gap-1.5 mt-1">
                            {activeRoom.wardrobeDeductionsList.length === 0 ? <span className="text-[10px] text-slate-400 italic">No wardrobes</span> : activeRoom.wardrobeDeductionsList.map((item, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <input type="number" value={item.length} onChange={(e) => {
                                  const newList = [...activeRoom.wardrobeDeductionsList];
                                  newList[i].length = Number(e.target.value);
                                  updateActiveRoom({ wardrobeDeductionsList: newList });
                                }} className="w-full bg-white border border-slate-200 rounded text-center py-1 text-[10px] font-bold" placeholder="L" min={0} />
                                <span className="text-slate-300 text-[10px]">×</span>
                                <input type="number" value={item.width} onChange={(e) => {
                                  const newList = [...activeRoom.wardrobeDeductionsList];
                                  newList[i].width = Number(e.target.value);
                                  updateActiveRoom({ wardrobeDeductionsList: newList });
                                }} className="w-full bg-white border border-slate-200 rounded text-center py-1 text-[10px] font-bold" placeholder="W" min={0} />
                                <button onClick={() => {
                                  const newList = activeRoom.wardrobeDeductionsList.filter((_, idx) => idx !== i);
                                  updateActiveRoom({ wardrobeDeductionsList: newList });
                                }} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dark Shade Constraints */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">3</span>
                      Dark Shade Constraints
                    </h3>
                    <div className="flex flex-col gap-3 mt-1 border border-slate-200 rounded-xl p-4 bg-white shadow-sm shadow-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                        Does any wall have a Dark Shade?
                      </h4>
                      <div className="flex gap-2">
                         {['A', 'B', 'C', 'D'].map(wall => (
                            <label key={wall} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer bg-slate-50">
                               <input type="checkbox" checked={activeRoom.darkShadeWalls?.includes(wall)} onChange={(e) => {
                                  const list = activeRoom.darkShadeWalls || [];
                                  if (e.target.checked) updateActiveRoom({ darkShadeWalls: [...list, wall] });
                                  else updateActiveRoom({ darkShadeWalls: list.filter(w => w !== wall) });
                               }} className="rounded border-slate-300 text-slate-800" />
                               <span className="text-[10px] font-bold text-slate-600">Wall {wall}</span>
                            </label>
                         ))}
                      </div>
                      {(activeRoom.darkShadeWalls?.length || 0) > 0 && (
                        <span className="block text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                          * Fresh painting will be applied for these walls.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div className="flex flex-col gap-3 md:col-span-2 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">4</span>
                      Add-ons & Specialty Finishes
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       {/* Wallpaper */}
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={activeRoom.wallpaperAddon?.enabled} onChange={(e) => updateActiveRoom({ wallpaperAddon: { ...activeRoom.wallpaperAddon, enabled: e.target.checked } })} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                            Wallpaper
                          </label>
                          {activeRoom.wallpaperAddon?.enabled && (
                            <div className="flex flex-col gap-2 pl-5 mt-1 border-l-2 border-slate-200">
                               <select value={activeRoom.wallpaperAddon.sku} onChange={(e) => updateActiveRoom({ wallpaperAddon: { ...activeRoom.wallpaperAddon, sku: e.target.value } })} className="text-xs p-1.5 rounded border border-slate-200">
                                  <option value="SKU-PNT-WALLPAPER">Standard Wallpaper</option>
                                  <option value="SKU-WP-PREMIUM">Premium Vinyl Wallpaper</option>
                                  <option value="SKU-WP-LUXURY">Luxury Custom Wallpaper</option>
                               </select>
                               <div className="flex gap-2 text-[10px]">
                                  {['A', 'B', 'C', 'D'].map(wall => (
                                      <label key={wall} className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={activeRoom.wallpaperAddon.walls.includes(wall)} onChange={(e) => {
                                            const list = activeRoom.wallpaperAddon.walls;
                                            const newWalls = e.target.checked ? [...list, wall] : list.filter(w => w !== wall);
                                            updateActiveRoom({ wallpaperAddon: { ...activeRoom.wallpaperAddon, walls: newWalls } });
                                        }} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                                        Wall {wall}
                                      </label>
                                  ))}
                               </div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">OR Custom Sqft:</span>
                                  <input type="number" value={activeRoom.wallpaperAddon.customArea} onChange={(e) => updateActiveRoom({ wallpaperAddon: { ...activeRoom.wallpaperAddon, customArea: Number(e.target.value) } })} className="w-16 p-1 text-xs border border-slate-200 rounded" />
                               </div>
                               <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded w-fit">* Base Prep will be added.</span>
                            </div>
                          )}
                       </div>

                       {/* Texture */}
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={activeRoom.textureAddon?.enabled} onChange={(e) => updateActiveRoom({ textureAddon: { ...activeRoom.textureAddon, enabled: e.target.checked } })} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                            Texture Paint
                          </label>
                          {activeRoom.textureAddon?.enabled && (
                            <div className="flex flex-col gap-2 pl-5 mt-1 border-l-2 border-slate-200">
                               <div className="flex gap-2 text-[10px]">
                                  {['A', 'B', 'C', 'D'].map(wall => (
                                      <label key={wall} className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={activeRoom.textureAddon.walls.includes(wall)} onChange={(e) => {
                                            const list = activeRoom.textureAddon.walls;
                                            const newWalls = e.target.checked ? [...list, wall] : list.filter(w => w !== wall);
                                            updateActiveRoom({ textureAddon: { ...activeRoom.textureAddon, walls: newWalls } });
                                        }} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                                        Wall {wall}
                                      </label>
                                  ))}
                               </div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">OR Custom Sqft:</span>
                                  <input type="number" value={activeRoom.textureAddon.customArea} onChange={(e) => updateActiveRoom({ textureAddon: { ...activeRoom.textureAddon, customArea: Number(e.target.value) } })} className="w-16 p-1 text-xs border border-slate-200 rounded" />
                               </div>
                               <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded w-fit">* Base Prep will be added.</span>
                            </div>
                          )}
                       </div>
                       
                       {/* Multi-Color */}
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={activeRoom.multiColorAddon?.enabled} onChange={(e) => updateActiveRoom({ multiColorAddon: { ...activeRoom.multiColorAddon, enabled: e.target.checked } })} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                            Multi-Color / Block Design
                          </label>
                          {activeRoom.multiColorAddon?.enabled && (
                            <div className="flex flex-col gap-2 pl-5 mt-1 border-l-2 border-slate-200">
                               <div className="flex gap-2 text-[10px]">
                                  {['A', 'B', 'C', 'D'].map(wall => (
                                      <label key={wall} className="flex items-center gap-1 cursor-pointer">
                                        <input type="checkbox" checked={activeRoom.multiColorAddon.walls.includes(wall)} onChange={(e) => {
                                            const list = activeRoom.multiColorAddon.walls;
                                            const newWalls = e.target.checked ? [...list, wall] : list.filter(w => w !== wall);
                                            updateActiveRoom({ multiColorAddon: { ...activeRoom.multiColorAddon, walls: newWalls } });
                                        }} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                                        Wall {wall}
                                      </label>
                                  ))}
                               </div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">OR Custom Sqft:</span>
                                  <input type="number" value={activeRoom.multiColorAddon.customArea} onChange={(e) => updateActiveRoom({ multiColorAddon: { ...activeRoom.multiColorAddon, customArea: Number(e.target.value) } })} className="w-16 p-1 text-xs border border-slate-200 rounded" />
                               </div>
                            </div>
                          )}
                       </div>
                       
                       {/* Enamel Paint */}
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={activeRoom.includeWoodworkEnamel} onChange={(e) => updateActiveRoom({ includeWoodworkEnamel: e.target.checked })} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                            Enamel Paint on Woodwork
                          </label>
                          {activeRoom.includeWoodworkEnamel && (
                            <div className="flex flex-col gap-2 pl-5 mt-1 border-l-2 border-slate-200">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">Total Sqft:</span>
                                  <input type="number" value={activeRoom.woodworkEnamelArea} onChange={(e) => updateActiveRoom({ woodworkEnamelArea: Number(e.target.value) })} className="w-16 p-1 text-xs border border-slate-200 rounded" />
                               </div>
                            </div>
                          )}
                       </div>

                       {/* Paintable Trims */}
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={activeRoom.paintableTrims?.enabled} onChange={(e) => updateActiveRoom({ paintableTrims: { ...activeRoom.paintableTrims, enabled: e.target.checked } })} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                            Paintable Trims / Moldings
                          </label>
                          {activeRoom.paintableTrims?.enabled && (
                            <div className="flex flex-col gap-2 pl-5 mt-1 border-l-2 border-slate-200">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">Running Feet (RFT):</span>
                                  <input type="number" value={activeRoom.paintableTrims.rft} onChange={(e) => updateActiveRoom({ paintableTrims: { ...activeRoom.paintableTrims, rft: Number(e.target.value) } })} className="w-16 p-1 text-xs border border-slate-200 rounded" />
                               </div>
                            </div>
                          )}
                       </div>

                       {/* Grooves Painting */}
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="flex items-center gap-2 font-bold text-xs text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={activeRoom.groovesPainting?.enabled} onChange={(e) => updateActiveRoom({ groovesPainting: { ...activeRoom.groovesPainting, enabled: e.target.checked } })} className="rounded border-slate-300 text-red-500 focus:ring-red-500" />
                            Grooves Painting
                          </label>
                          {activeRoom.groovesPainting?.enabled && (
                            <div className="flex flex-col gap-2 pl-5 mt-1 border-l-2 border-slate-200">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">Running Feet (RFT):</span>
                                  <input type="number" value={activeRoom.groovesPainting.rft} onChange={(e) => updateActiveRoom({ groovesPainting: { ...activeRoom.groovesPainting, rft: Number(e.target.value) } })} className="w-16 p-1 text-xs border border-slate-200 rounded" />
                               </div>
                            </div>
                          )}
                       </div>

                    </div>
                  </div>
                </>
              )}

              {/* CEILING CONFIG - Restructured */}
              {activeTab === "fc" && (
                <>
                  {/* Main SKU Selection */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">1</span>
                      Main SKU Selection
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ceiling Design Shape</label>
                        <select 
                          value={activeRoom.fcType}
                          onChange={(e) => updateActiveRoom({ fcType: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                        >
                          <option value="none">No False Ceiling</option>
                          <option value="peripheral">Peripheral Drop Band</option>
                          <option value="full">Full Ceiling Raft</option>
                          <option value="l_band">L-Band border</option>
                          <option value="u_band">U-Band border</option>
                          <option value="box">Floating Box / Island</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Board Brand/Material</label>
                        <select 
                          value={activeRoom.fcMaterial}
                          onChange={(e) => updateActiveRoom({ fcMaterial: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                        >
                          <option value="standard_gypsum">Standard Gypsum (Local)</option>
                          <option value="premium_gypsum">Premium Saint Gobain (Gyproc)</option>
                          <option value="pop">POP Custom boards</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-2 border border-slate-200 rounded-xl p-4 bg-white shadow-sm shadow-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Are false ceiling lights supplied by Livspace or the Client?
                      </h4>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateActiveRoom({ lightsSuppliedByUs: true })}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            activeRoom.lightsSuppliedByUs 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          Livspace (Auto-inject Light Points)
                        </button>
                        <button 
                          onClick={() => updateActiveRoom({ lightsSuppliedByUs: false })}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            !activeRoom.lightsSuppliedByUs 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          Client (Exclude Light Points)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dependent Line Items */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">2</span>
                      Dependent Line Items
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer w-full">
                          <input 
                            type="checkbox" 
                            checked={activeRoom.fcCoveEnabled}
                            onChange={(e) => updateActiveRoom({ fcCoveEnabled: e.target.checked })}
                            className="rounded border-slate-300 text-red-500 focus:ring-red-500"
                          />
                          <span className="text-xs font-semibold text-slate-700">Light Cove Recess</span>
                        </label>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-600 font-medium">Gala Cutouts (Qty)</span>
                        <input 
                          type="number" 
                          value={activeRoom.fcGalaCutouts}
                          onChange={(e) => updateActiveRoom({ fcGalaCutouts: Number(e.target.value) })}
                          className="w-10 bg-white border border-slate-200 text-slate-900 text-center font-bold rounded py-0.5"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dependent Constraints */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">3</span>
                      Dependent Constraints
                    </h3>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1 mb-2">
                      <span className="text-xs font-bold text-slate-700">Ceiling Height Constraint</span>
                      <span className="text-[10px] text-slate-500">Currently set to <span className="font-extrabold text-slate-900">{activeRoom.height} ft</span> in Room Size tab.</span>
                      {activeRoom.height < 9 && (
                        <span className="text-[9px] text-amber-600 font-bold mt-1">⚠ Low ceiling height detected. Full drops may not be feasible.</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Border Drop Width</label>
                        <select 
                          value={activeRoom.fcWidth}
                          onChange={(e) => updateActiveRoom({ fcWidth: Number(e.target.value) })}
                          disabled={activeRoom.fcType === "full" || activeRoom.fcType === "none" || activeRoom.fcType === "box"}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none disabled:opacity-50"
                        >
                          <option value={1}>1.0 Foot</option>
                          <option value={1.5}>1.5 Feet</option>
                          <option value={2}>2.0 Feet</option>
                        </select>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-600 font-medium">Curtain Pelmet (RFT)</span>
                        <input 
                          type="number" 
                          value={activeRoom.fcCurtainPelmetLength}
                          onChange={(e) => updateActiveRoom({ fcCurtainPelmetLength: Number(e.target.value) })}
                          className="w-10 bg-white border border-slate-200 text-slate-900 text-center font-bold rounded py-0.5"
                          min={0}
                        />
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <span className="text-slate-600 font-medium">Curved designs (RFT)</span>
                        <input 
                          type="number" 
                          value={activeRoom.fcCurvedDesignLength}
                          onChange={(e) => updateActiveRoom({ fcCurvedDesignLength: Number(e.target.value) })}
                          className="w-10 bg-white border border-slate-200 text-slate-900 text-center font-bold rounded py-0.5"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div className="flex flex-col gap-3 md:col-span-2 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">4</span>
                      Add-ons
                    </h3>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wiring Package Inclusions</label>
                      <div className="flex items-center gap-2 mt-0.5 md:w-1/2">
                        <button 
                          onClick={() => updateActiveRoom({ fcElectricalIncluded: true })}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            activeRoom.fcElectricalIncluded 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          With LED Wiring
                        </button>
                        <button 
                          onClick={() => updateActiveRoom({ fcElectricalIncluded: false })}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                            !activeRoom.fcElectricalIncluded 
                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          Excl. Wiring
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { id: "PVC Trims", label: "+ PVC Edge Trims" }
                      ].map(addon => {
                        const active = activeRoom.fcAddOns.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => {
                              const newAddOns = active 
                                ? activeRoom.fcAddOns.filter(x => x !== addon.id)
                                : [...activeRoom.fcAddOns, addon.id];
                              updateActiveRoom({ fcAddOns: newAddOns });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                              active 
                                ? "bg-red-50 border-red-200 text-red-600 shadow-sm" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {addon.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}


              {/* ELECTRICAL CONFIG - Restructured */}
              {activeTab === "electrical" && (
                <>
                  {/* Main SKU Selection */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">1</span>
                      Main SKU Selection
                    </h3>
                    
                    <div className="flex flex-col gap-1.5 md:w-1/2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Predefined Points Package</label>
                      <select 
                        value={activeRoom.electricalPackage}
                        onChange={(e) => updateActiveRoom({ electricalPackage: e.target.value as any })}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                      >
                        <option value="none">No Package (Itemised points)</option>
                        <option value="pkg_25">Electrical Package (25 Points)</option>
                        <option value="pkg_30">Electrical Package (30 Points)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dependent Line Items */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">2</span>
                      Dependent Line Items
                    </h3>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Itemised MEP Point Placement</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Ceiling Prim.</label>
                          <input 
                            type="number" 
                            value={activeRoom.newPrimaryPoints}
                            onChange={(e) => updateActiveRoom({ newPrimaryPoints: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Ceiling Sec.</label>
                          <input 
                            type="number" 
                            value={activeRoom.newSecondaryPoints}
                            onChange={(e) => updateActiveRoom({ newSecondaryPoints: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Wall Primary</label>
                          <input 
                            type="number" 
                            value={activeRoom.wallPrimaryPoints}
                            onChange={(e) => updateActiveRoom({ wallPrimaryPoints: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Relocations</label>
                          <input 
                            type="number" 
                            value={activeRoom.relocationsCount}
                            onChange={(e) => updateActiveRoom({ relocationsCount: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer w-full">
                          <input 
                            type="checkbox" 
                            checked={activeRoom.acPointsCount > 0}
                            onChange={(e) => updateActiveRoom({ acPointsCount: e.target.checked ? 1 : 0 })}
                            className="rounded border-slate-300 text-red-500 focus:ring-red-500"
                          />
                          <span className="text-xs font-semibold text-slate-700">Dedicated AC Point</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Dependent Constraints */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">3</span>
                      Dependent Constraints
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sub-surface Wall Type</label>
                        <select 
                          value={activeRoom.wallType}
                          onChange={(e) => updateActiveRoom({ wallType: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                        >
                          <option value="brick">Brick Wall (Standard chiseling)</option>
                          <option value="concrete">Concrete shear wall / Column</option>
                        </select>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs h-10 mt-5">
                        <span className="text-slate-600 font-medium">Conduit Laying (RFT)</span>
                        <input 
                          type="number" 
                          value={activeRoom.conduitLayingLength}
                          onChange={(e) => updateActiveRoom({ conduitLayingLength: Number(e.target.value) })}
                          className="w-12 bg-white border border-slate-200 text-slate-900 text-center font-bold rounded py-0.5"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div className="flex flex-col gap-3 md:col-span-2 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">4</span>
                      Add-ons
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "Fan Fixing", label: "+ Fan Installation" }
                      ].map(addon => {
                        const active = activeRoom.electricalAddOns.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => {
                              const newAddOns = active 
                                ? activeRoom.electricalAddOns.filter(x => x !== addon.id)
                                : [...activeRoom.electricalAddOns, addon.id];
                              updateActiveRoom({ electricalAddOns: newAddOns });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                              active 
                                ? "bg-red-50 border-red-200 text-red-600 shadow-sm" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {addon.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}


              {/* PLUMBING CONFIG - Restructured */}
              {activeTab === "plumbing" && (
                <>
                  {/* Main SKU Selection */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">1</span>
                      Main SKU Selection
                    </h3>
                    
                    <div className="flex flex-col gap-1.5 md:w-1/2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bathroom/Kitchen Packages</label>
                      <select 
                        value={activeRoom.plumbingPackage}
                        onChange={(e) => updateActiveRoom({ plumbingPackage: e.target.value as any })}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                      >
                        <option value="none">No Package (Itemised work)</option>
                        <option value="toilet_pkg">Complete Toilet Package (Remodeling)</option>
                        <option value="kitchen_pkg">Kitchen Plumbing Package</option>
                      </select>
                    </div>
                  </div>

                  {/* Dependent Line Items */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">2</span>
                      Dependent Line Items
                    </h3>

                    <div className="flex flex-col gap-1.5 md:w-1/2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WC Fixture Type</label>
                      <select 
                        value={activeRoom.wcType}
                        onChange={(e) => updateActiveRoom({ wcType: e.target.value as any })}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                      >
                        <option value="none">No WC Toilet</option>
                        <option value="floor">Western WC - Floor Mounted</option>
                        <option value="wall">Western WC - Wall Mounted (concealed)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Itemised Fixture Installations</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Wash Basins</label>
                          <input 
                            type="number" 
                            value={activeRoom.washBasinsCount}
                            onChange={(e) => updateActiveRoom({ washBasinsCount: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Taps Count</label>
                          <input 
                            type="number" 
                            value={activeRoom.tapsCount}
                            onChange={(e) => updateActiveRoom({ tapsCount: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Geyser Mounts</label>
                          <input 
                            type="number" 
                            value={activeRoom.geysersCount}
                            onChange={(e) => updateActiveRoom({ geysersCount: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <label className="text-[10px] text-slate-500 font-bold">Kitchen Sinks</label>
                          <input 
                            type="number" 
                            value={activeRoom.kitchenSinksCount}
                            onChange={(e) => updateActiveRoom({ kitchenSinksCount: Number(e.target.value) })}
                            className="bg-white border border-slate-200 rounded text-center py-1 text-xs font-bold"
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dependent Constraints */}
                  <div className="flex flex-col gap-3 md:col-span-2 border-b border-slate-100 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">3</span>
                      Dependent Constraints
                    </h3>
                    
                    <div className="flex flex-col gap-1.5 md:w-1/2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Pipe Lines</label>
                      <select 
                        value={activeRoom.internalPlumbingLine}
                        onChange={(e) => updateActiveRoom({ internalPlumbingLine: e.target.value as any })}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none"
                      >
                        <option value="none">No Pipe relocations</option>
                        <option value="cold">Cold Water Supply Line</option>
                        <option value="cold_hot">Cold & Hot Water lines (Dual run)</option>
                      </select>
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div className="flex flex-col gap-3 md:col-span-2 pb-4">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-500 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">4</span>
                      Add-ons
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "Mixer Installation", label: "+ Hot/Cold Mixer Tap" }
                      ].map(addon => {
                        const active = activeRoom.plumbingAddOns.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => {
                              const newAddOns = active 
                                ? activeRoom.plumbingAddOns.filter(x => x !== addon.id)
                                : [...activeRoom.plumbingAddOns, addon.id];
                              updateActiveRoom({ plumbingAddOns: newAddOns });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                              active 
                                ? "bg-red-50 border-red-200 text-red-600 shadow-sm" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {addon.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

            </div>            </div>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Decisions Console log (Left 5 col) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-3 h-[250px] shadow-sm shadow-slate-100">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            System Decisions & Constraints Log
          </h2>

          <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-2 pr-2">
            {calculationResult.auditLogs.length === 0 ? (
              <span className="text-slate-400 italic text-center mt-12">No rules or overrides triggered. Adjust parameters to check.</span>
            ) : (
              calculationResult.auditLogs.map((log, i) => {
                let badgeColor = "text-slate-700 bg-slate-50 border border-slate-200/60";
                if (log.type === "auto_override") badgeColor = "text-red-700 bg-red-50/60 border border-red-200/50";
                if (log.type === "constraint") badgeColor = "text-amber-800 bg-amber-50/60 border border-amber-200/50";
                if (log.type === "warning") badgeColor = "text-yellow-800 bg-yellow-50/60 border border-yellow-200/50";

                return (
                  <div key={i} className={`p-2.5 rounded-xl flex flex-col gap-1 ${badgeColor}`}>
                    <div className="flex justify-between items-center text-[9px] font-extrabold uppercase tracking-wider opacity-85">
                      <span>{log.category} | {log.type}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-semibold">{log.message}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>


        </div>

      {/* BILL OF QUANTITIES (BOQ) PRICING TABLE (Light, visual layout) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col gap-4 shadow-sm shadow-slate-100">
        
        {/* Totals Summary Row */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-100 pb-4 gap-4">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-red-500" />
            Derived Bill of Quantities (BOQ)
          </h2>

          <div className="flex flex-wrap gap-2 md:gap-4 text-xs font-mono">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Painting</span>
              <span className="text-slate-800 font-bold text-sm">₹{calculationResult.totals.painting.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Ceiling</span>
              <span className="text-slate-800 font-bold text-sm">₹{calculationResult.totals.falseCeiling.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Electrical</span>
              <span className="text-slate-800 font-bold text-sm">₹{calculationResult.totals.electrical.toLocaleString()}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Plumbing</span>
              <span className="text-slate-800 font-bold text-sm">₹{calculationResult.totals.plumbing.toLocaleString()}</span>
            </div>
            {calculationResult.totals.globalConstraints > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Logistics</span>
                <span className="text-slate-800 font-bold text-sm">₹{calculationResult.totals.globalConstraints.toLocaleString()}</span>
              </div>
            )}
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-1.5 flex flex-col justify-center">
              <span className="text-red-500 block text-[9px] uppercase font-bold">Grand Total ({globalParams.city})</span>
              <span className="text-red-600 font-extrabold text-base">₹{calculationResult.totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* BOQ Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm shadow-slate-50 max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-3.5">SKU Code</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Item Description</th>
                <th className="p-3.5">Brand / Spec</th>
                <th className="p-3.5 text-center">Unit</th>
                <th className="p-3.5 text-right">Qty</th>
                <th className="p-3.5 text-right">Rate</th>
                <th className="p-3.5 text-right">Total</th>
                <th className="p-3.5 text-center">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculationResult.bom.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    BOQ is empty. Enable categories to trigger calculations.
                  </td>
                </tr>
              ) : (
                calculationResult.bom.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-3.5">
                      <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">
                        {item.skuCode || "MANUAL"}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {item.superCategory}
                      <span className="block text-[10px] text-slate-400 font-normal">{item.subSuperCategory}</span>
                    </td>
                    <td className="p-3.5 max-w-[280px]">
                      <span className="font-bold text-slate-800">{item.itemName}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={item.description}>
                        {item.description}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      <span>{item.brand}</span>
                      {item.specification && item.specification !== "NA" && (
                        <span className="block text-[10px] text-slate-400">{item.specification}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{item.unit}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      ₹{item.rate.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-900">
                      ₹{item.total.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.source === "derived" 
                          ? "bg-blue-50 text-blue-600 border border-blue-100" 
                          : item.source === "add-on" 
                          ? "bg-purple-50 text-purple-600 border border-purple-100" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {item.source}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
      </>
      )}
      
    </div>
  );
}
