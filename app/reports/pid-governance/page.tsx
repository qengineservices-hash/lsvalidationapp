"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Download,
  ChevronRight,
  X,
  Sliders,
  DollarSign,
  TrendingUp,
  Package
} from "lucide-react";

// Types
import type {
  PidGovernanceSummary,
  PortfolioGovernanceMetrics,
  TradeSummary,
  AuditedLineItem,
  ClubbedLineItem
} from "@/lib/pid-governance-engine";

import {
  getPriceBucket,
  getBucketColorClasses,
  PRICE_BUCKETS
} from "@/lib/price-buckets";

const initialPortfolio: PortfolioGovernanceMetrics = {
  totalProjects: 0,
  totalConvertedBoQ: 0,
  totalStandardBoQ: 0,
  totalSpecialisedBoQ: 0,
  portfolioSpecialisedSharePct: 0,
  portfolioTotalNri: 0,
  portfolioRiskMultiplier: 0,
  totalRateOverridesCount: 0,
  totalRateOverridesValue: 0,
  riskClassCounts: { critical: 0, high: 0, medium: 0, low: 0 },
  cityCounts: {},
  buCounts: {},
  tradeTotals: {}
};

export default function PidGovernancePage() {
  const [data, setData] = useState<{
    syncMetadata: any;
    portfolio: PortfolioGovernanceMetrics;
    pids: PidGovernanceSummary[];
  }>({
    syncMetadata: { areaRateThreshold: 2000, rulesMasterId: "1RllaOUwuh1JjCdhigYrwRcwMBygay7lzMD23-xrTbAs" },
    portfolio: initialPortfolio,
    pids: []
  });
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"scorecard" | "portfolio" | "rules">("scorecard");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedBu, setSelectedBu] = useState("ALL");
  const [selectedTrade, setSelectedTrade] = useState("ALL");
  const [selectedSourcing, setSelectedSourcing] = useState("ALL");
  const [selectedBucket, setSelectedBucket] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Selected PID for Deep Drawer Drilldown
  const [activePid, setActivePid] = useState<PidGovernanceSummary | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [lineSearch, setLineSearch] = useState("");
  const [skuViewMode, setSkuViewMode] = useState<"clubbed" | "raw">("clubbed");

  // Load Initial Governance Summary Data via API
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/pid-governance/data")
      .then((res) => res.json())
      .then((json) => {
        if (json && json.pids) {
          setData(json);
        }
      })
      .catch((err) => console.error("Error loading PID governance data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch On-Demand SKU items when a PID is opened in the drawer
  useEffect(() => {
    setLineSearch("");
    setSkuViewMode("clubbed");

    if (activePid && (!activePid.clubbedLineItems || activePid.clubbedLineItems.length === 0)) {
      setIsLoadingItems(true);
      fetch(`/api/pid-governance/items?pid=${activePid.projectId}`)
        .then((res) => res.json())
        .then((items) => {
          if (items) {
            setActivePid((prev) =>
              prev && prev.projectId === activePid.projectId
                ? {
                    ...prev,
                    clubbedLineItems: items.clubbedLineItems || [],
                    lineItems: items.lineItems || []
                  }
                : prev
            );
          }
        })
        .catch((err) => console.error("Error loading items for PID:", err))
        .finally(() => setIsLoadingItems(false));
    }
  }, [activePid?.projectId]);

  // Sync Live Handler
  const handleLiveSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Connecting to Google Sheets API and fetching live Supply quotation rows...");
    try {
      const res = await fetch("/api/pid-governance/sync", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setSyncStatus("Sync complete! Refreshing view...");
        window.location.reload();
      } else {
        setSyncStatus(`Sync error: ${result.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setSyncStatus(`Network error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Distinct Filter Options
  const cities = useMemo(() => {
    const set = new Set<string>();
    data.pids.forEach((p) => { if (p.city) set.add(p.city); });
    return Array.from(set).sort();
  }, [data]);

  const bus = useMemo(() => {
    const set = new Set<string>();
    data.pids.forEach((p) => { if (p.bu) set.add(p.bu); });
    return Array.from(set).sort();
  }, [data]);

  // Filtered PIDs
  const filteredPids = useMemo(() => {
    return data.pids.filter((p) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesPid = p.projectId.toLowerCase().includes(query);
        const matchesCity = p.city.toLowerCase().includes(query);
        const matchesVl = p.vlEmail.toLowerCase().includes(query);
        if (!matchesPid && !matchesCity && !matchesVl) return false;
      }
      if (selectedCity !== "ALL" && p.city !== selectedCity) return false;
      if (selectedBu !== "ALL" && p.bu !== selectedBu) return false;
      if (selectedTrade !== "ALL") {
        const tradeData = p.trades[selectedTrade];
        if (!tradeData || tradeData.totalQuote <= 0) return false;
      }
      if (selectedSourcing !== "ALL") {
        if (selectedSourcing === "SPECIALIST" && !p.sourcingAllocationPolicy.includes("Specialist")) return false;
        if (selectedSourcing === "STANDARD" && p.sourcingAllocationPolicy.includes("Specialist")) return false;
      }
      if (selectedBucket !== "ALL") {
        const bucket = p.priceBucket || getPriceBucket(p.totalServicesQuote);
        if (bucket !== selectedBucket) return false;
      }
      return true;
    });
  }, [data, searchTerm, selectedCity, selectedBu, selectedTrade, selectedSourcing, selectedBucket]);

  // Pagination
  const totalPages = Math.ceil(filteredPids.length / pageSize) || 1;
  const paginatedPids = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPids.slice(start, start + pageSize);
  }, [filteredPids, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedBu, selectedTrade, selectedSourcing, selectedBucket]);

  // Helper Formatters
  const formatINR = (val: number) => {
    return "₹" + Math.round(val).toLocaleString("en-IN");
  };

  const renderBucketBadge = (val: number | string | undefined | null) => {
    const bucket = typeof val === "number" ? getPriceBucket(val) : (val || "—");
    if (!bucket || bucket === "—" || bucket === "None") {
      return <span className="text-slate-400 font-mono text-xs">—</span>;
    }
    const colors = getBucketColorClasses(bucket);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${colors}`}>
        {bucket}
      </span>
    );
  };

  const getScopeBadge = (scope: string) => {
    if (scope === "Specialised") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Specialised</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Standard</span>;
  };

  // Export CSV Handler
  const exportCsv = (pid?: PidGovernanceSummary) => {
    let rows: any[] = [];
    if (pid) {
      if (skuViewMode === "clubbed" && pid.clubbedLineItems && pid.clubbedLineItems.length > 0) {
        rows = pid.clubbedLineItems.map((l, i) => ({
          "Sl": i + 1,
          "PID": pid.projectId,
          "SKU Code": l.sku,
          "Clean Item Description": l.name,
          "Trade": l.trade,
          "Sub Category": l.subCategory,
          "UOM": l.unit,
          "Consolidated Qty": l.quantity,
          "Blended Unit Rate (₹/Qty)": l.unitPrice,
          "Total Value (Bucket)": l.priceBucket || getPriceBucket(l.preTaxPrice),
          "Scope Tag": l.scopeTag,
          "Rate Rule Flag": l.rateRuleFlag,
          "Supply Allocation Action": l.sourcingAction,
          "Lines Clubbed": l.lineCount
        }));
      } else {
        rows = pid.lineItems.map((l, i) => ({
          "Sl": i + 1,
          "PID": l.projectId,
          "Trade": l.trade,
          "Item Name": l.cleanName,
          "SKU": l.sku,
          "UOM": l.unit,
          "Qty": l.quantity,
          "Unit Rate (₹/Qty)": l.unitPrice,
          "Total Value (Bucket)": getPriceBucket(l.preTaxPrice),
          "Scope Tag": l.scopeTag,
          "Rate Override": l.rateRuleFlag,
          "Supply Allocation Action": l.sourcingAction
        }));
      }
    } else {
      rows = filteredPids.map((p, i) => ({
        "Sl": i + 1,
        "PID": p.projectId,
        "City": p.city,
        "BU": p.bu,
        "VL Email": p.vlEmail,
        "Consolidated SKUs": p.consolidatedSkuCount || p.clubbedLineItems?.length || p.itemCount,
        "Total Quotation Lines": p.itemCount,
        "Total BoQ (Bucket)": p.priceBucket || getPriceBucket(p.totalServicesQuote),
        "Standard Scope (Bucket)": p.standardBucket || getPriceBucket(p.standardScopeQuote),
        "Specialised Scope (Bucket)": p.specialisedBucket || getPriceBucket(p.specialisedScopeQuote),
        "Rate > ₹2k Overrides Count": p.rateOverrideCount,
        "Rate > ₹2k Overrides Band": getPriceBucket(p.rateOverrideQuote),
        "Sourcing Policy": p.sourcingAllocationPolicy,
        "Approval Gate": p.mandatoryApprovalGate
      }));
    }

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = "data:text/csv;charset=utf-8," + [
      headers.join(","),
      ...rows.map(row => headers.map(h => `"${(row[h] + "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", pid ? `PID_${pid.projectId}_Sourcing_BoQ.csv` : "Portfolio_Supply_Sourcing_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                  Supply Vertical
                </span>
                <span className="text-xs text-slate-400">Contractor & Partner Allocation Engine</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
                PID Sourcing & Contractor Allocation
              </h1>
              <p className="text-xs text-slate-400">
                Formula-Driven Scope Classification & Partner Allocation | {data.portfolio.totalProjects} Converted PIDs | Consolidated SKU Registry
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={handleLiveSync}
                disabled={isSyncing}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing Sheet..." : "Sync Live from Google Sheets"}
              </button>

              <button
                onClick={() => exportCsv()}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export Portfolio CSV
              </button>
            </div>
          </div>

          {syncStatus && (
            <div className="mt-2 text-xs text-emerald-400 bg-slate-800/80 px-2.5 py-1 rounded border border-emerald-500/30">
              {syncStatus}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mt-3 border-t border-slate-800 pt-2.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab("scorecard")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "scorecard"
                  ? "bg-slate-800 text-white font-semibold shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              PID Sourcing Scorecard ({filteredPids.length})
            </button>
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "portfolio"
                  ? "bg-slate-800 text-white font-semibold shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Macro Portfolio Summary
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "rules"
                  ? "bg-slate-800 text-white font-semibold shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Rules & Keywords Master (Live)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Tier 1 Portfolio KPI Scorecard - Simplified 4-Card Supply Slate (Price Buckets) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Services BoQ (Bucket)</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {renderBucketBadge(data.portfolio.totalBoqBucket || data.portfolio.totalConvertedBoQ)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across {data.portfolio.totalProjects} converted 2026 PIDs
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Standard Scope Volume (Bucket)</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {renderBucketBadge(data.portfolio.totalStandardBucket || data.portfolio.totalStandardBoQ)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Standard Contractor Pool Dispatch
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Specialised Scope Volume (Bucket)</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {renderBucketBadge(data.portfolio.totalSpecialisedBucket || data.portfolio.totalSpecialisedBoQ)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Specialist Trade Partner Allocation
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Rate &gt; ₹2k Overrides</span>
              <Sliders className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {data.portfolio.totalRateOverridesCount} items
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Value Band: {data.portfolio.totalRateOverridesBucket || getPriceBucket(data.portfolio.totalRateOverridesValue)}
            </div>
          </div>
        </div>

        {/* TAB 1: PID Sourcing Scorecard */}
        {activeTab === "scorecard" && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search PID, City, VL..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Cities ({cities.length})</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedBu}
                  onChange={(e) => setSelectedBu(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All BUs ({bus.length})</option>
                  {bus.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Trades</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Civil">Civil</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="False Ceiling">False Ceiling</option>
                  <option value="Painting">Painting</option>
                </select>

                <select
                  value={selectedSourcing}
                  onChange={(e) => setSelectedSourcing(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Sourcing Policies</option>
                  <option value="SPECIALIST">Specialist Trade Required</option>
                  <option value="STANDARD">Standard Pool Dispatch</option>
                </select>

                <select
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Price Bands</option>
                  {PRICE_BUCKETS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {(searchTerm || selectedCity !== "ALL" || selectedBu !== "ALL" || selectedTrade !== "ALL" || selectedSourcing !== "ALL" || selectedBucket !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCity("ALL");
                      setSelectedBu("ALL");
                      setSelectedTrade("ALL");
                      setSelectedSourcing("ALL");
                      setSelectedBucket("ALL");
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* PID Master Table */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3.5">PID</th>
                      <th className="py-3 px-3.5">City / BU</th>
                      <th className="py-3 px-3.5 text-right">SKUs (Lines)</th>
                      <th className="py-3 px-3.5 text-right font-bold text-white">Total BoQ (Bucket)</th>
                      <th className="py-3 px-3.5 text-right">Standard Scope (Bucket)</th>
                      <th className="py-3 px-3.5 text-right text-rose-400 font-bold">Specialised Scope (Bucket)</th>
                      <th className="py-3 px-3.5 text-center">Rate &gt; ₹2k Overrides</th>
                      <th className="py-3 px-3.5">Sourcing Allocation Policy</th>
                      <th className="py-3 px-3.5">Approval Gate</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-slate-500 text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                          Loading 2026 PID Sourcing & Contractor Allocation Registry...
                        </td>
                      </tr>
                    ) : paginatedPids.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                          No projects match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedPids.map((p, idx) => {
                        const rowNum = (currentPage - 1) * pageSize + idx + 1;
                        const skuCount = p.consolidatedSkuCount || p.clubbedLineItems?.length || p.itemCount;
                        const isSpecialist = p.sourcingAllocationPolicy.includes("Specialist");

                        return (
                          <tr
                            key={p.projectId}
                            onClick={() => setActivePid(p)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">{rowNum}</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 font-mono">
                              {p.projectId}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <div className="font-medium text-slate-800">{p.city}</div>
                              <div className="text-[10px] text-slate-400">{p.bu}</div>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                              <span className="font-bold text-slate-900">{skuCount}</span>
                              <span className="text-[10px] text-slate-400 block font-sans">({p.itemCount} lines)</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold font-mono">
                              {renderBucketBadge(p.priceBucket || p.totalServicesQuote)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono">
                              {renderBucketBadge(p.standardBucket || p.standardScopeQuote)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-semibold font-mono">
                              {p.specialisedScopeQuote > 0 ? renderBucketBadge(p.specialisedBucket || p.specialisedScopeQuote) : <span className="text-slate-400 font-mono text-xs">—</span>}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              {p.rateOverrideCount > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  {p.rateOverrideCount} items ({getPriceBucket(p.rateOverrideQuote)})
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-xs">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                                isSpecialist
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}>
                                {p.sourcingAllocationPolicy}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-xs text-slate-700">
                              <span className="line-clamp-1">{p.mandatoryApprovalGate}</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePid(p);
                                }}
                                className="inline-flex items-center px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition-colors"
                              >
                                View Sourcing BoQ <ChevronRight className="w-3 h-3 ml-0.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredPids.length)} of {filteredPids.length} projects
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1 font-semibold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Macro Portfolio Summary */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Trade Matrix Breakdown Across Entire Portfolio */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Portfolio Trade Breakdown & Supply Allocation Matrix
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Cumulative volumes, standard vs specialised scope, and supply contractor allocation across all {data.portfolio.totalProjects} projects.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3.5">Trade (Super Category)</th>
                      <th className="py-2.5 px-3.5 text-right font-bold text-white">Total Value (Bucket)</th>
                      <th className="py-2.5 px-3.5 text-right">Standard Scope (Bucket)</th>
                      <th className="py-2.5 px-3.5 text-right text-rose-400 font-bold">Specialised Scope (Bucket)</th>
                      <th className="py-2.5 px-3.5">Primary Sourcing Strategy Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.values(data.portfolio.tradeTotals).map((tr) => (
                      <tr key={tr.trade} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5 font-bold text-slate-900">{tr.trade}</td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold">{renderBucketBadge(tr.totalQuote)}</td>
                        <td className="py-3 px-3.5 text-right font-mono">{renderBucketBadge(tr.standardQuote)}</td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold">
                          {tr.specialisedQuote > 0 ? renderBucketBadge(tr.specialisedQuote) : <span className="text-slate-400 font-mono text-xs">—</span>}
                        </td>
                        <td className="py-3 px-3.5 text-xs text-slate-700 font-medium">{tr.vendorPoolStrategy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* City & BU Distributions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">City-Wise Services Portfolio</h3>
                <div className="space-y-2">
                  {Object.entries(data.portfolio.cityCounts)
                    .sort((a, b) => b[1].totalBoQ - a[1].totalBoQ)
                    .slice(0, 8)
                    .map(([city, stat]) => (
                      <div key={city} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="font-semibold text-slate-800">{city}</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 mr-2">{formatINR(stat.totalBoQ)}</span>
                          <span className="text-[11px] text-slate-500">({stat.count} PIDs)</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Business Unit (BU) Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(data.portfolio.buCounts)
                    .sort((a, b) => b[1].totalBoQ - a[1].totalBoQ)
                    .map(([bu, stat]) => (
                      <div key={bu} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="font-semibold text-slate-800">{bu || "Other / Custom"}</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 mr-2">{formatINR(stat.totalBoQ)}</span>
                          <span className="text-[11px] text-slate-500">({stat.count} PIDs)</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Rules & Keywords Master (Live & Audited) */}
        {activeTab === "rules" && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Live Scope Classification Rules & Keyword Mapping Master
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dynamically linked to Google Sheets ({data.syncMetadata.rulesMasterId}). Tab: Keyword Mapping Master.
                  </p>
                </div>
                <button
                  onClick={handleLiveSync}
                  disabled={isSyncing}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                  Re-fetch Rules from Sheet
                </button>
              </div>

              {/* Scope Governing Principles */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  1. Title & Inclusions Matching Protocol (Zero False Positives)
                </h3>
                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-900">Scan Target:</span> Line Item Name and Inclusions Only. Exclusions and metadata boilerplate (&quot;NA&quot;) are ignored.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Clean Panelling Rule:</span> Standard laminate panellings without premium finishes or high unit rates remain strictly Standard scope.
                  </div>
                </div>
              </div>

              {/* Area Rate Threshold Rule */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  2. Area Rate Threshold Rule (UOM Governed)
                </h3>
                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-900">Financial Threshold:</span> Unit Rate &gt; ₹{data.syncMetadata.areaRateThreshold}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Governed UOMs (Area Intensity):</span> SqFt, RFt, Sq ft, R ft
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Impact:</span> Classified as Specialised Scope requiring Specialist Contractor allocation.
                  </div>
                </div>
              </div>

              {/* Sourcing Allocation Framework */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  3. Sourcing Allocation Policies
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded">
                    <div className="font-bold text-rose-800">Specialist Trade Vendor Allocation Required</div>
                    <div className="text-rose-700 mt-1">Triggered when any line item is Specialised Scope or Rate &gt; ₹2k Override.</div>
                    <div className="text-[11px] text-rose-600 mt-1.5">Action: Route to qualified specialist vendor pool (Duco/PU/Veneer, Waterproofing, Heavy Load, Concealed Loop).</div>
                  </div>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded">
                    <div className="font-bold text-emerald-800">Standard Contractor Pool Dispatch</div>
                    <div className="text-emerald-700 mt-1">Triggered when all line items in the BoQ are 100% Standard scope and rates are within standard bands.</div>
                    <div className="text-[11px] text-emerald-600 mt-1.5">Action: Dispatch to standard trade contractor pool via automated assignment.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PID Detail Drawer / Modal */}
      {activePid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold">
                    PID {activePid.projectId}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {activePid.city} • {activePid.bu}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                    activePid.sourcingAllocationPolicy.includes("Specialist")
                      ? "bg-rose-900 text-rose-200 border border-rose-700"
                      : "bg-emerald-900 text-emerald-200 border border-emerald-700"
                  }`}>
                    {activePid.sourcingAllocationPolicy}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  VL: {activePid.vlEmail} • Published: {activePid.publishedAt ? new Date(activePid.publishedAt).toLocaleDateString() : "Converted"}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => exportCsv(activePid)}
                  className="inline-flex items-center px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export Sourcing BoQ
                </button>
                <button
                  onClick={() => setActivePid(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TIER 1: Executive KPI Scorecard */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tier 1: Sourcing Financial & Policy Summary (Discrete Price Buckets)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">TOTAL SERVICES BOQ (BUCKET)</div>
                    <div className="mt-1">{renderBucketBadge(activePid.priceBucket || activePid.totalServicesQuote)}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Total Value Band across Project</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">STANDARD SERVICES SCOPE (BUCKET)</div>
                    <div className="mt-1">{renderBucketBadge(activePid.standardBucket || activePid.standardScopeQuote)}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Standard Contractor Pool Band</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">SPECIALISED SERVICES SCOPE (BUCKET)</div>
                    <div className="mt-1">
                      {activePid.specialisedScopeQuote > 0 ? (
                        renderBucketBadge(activePid.specialisedBucket || activePid.specialisedScopeQuote)
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">None</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Specialist Partner Pool Band</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-medium">RATE &gt; ₹2K OVERRIDES</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{activePid.rateOverrideCount} items</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {activePid.rateOverrideCount > 0 ? `Value: ${getPriceBucket(activePid.rateOverrideQuote)}` : "0 items"}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 mr-2">Approval Gate:</span>
                    <span className="font-semibold text-slate-900">{activePid.mandatoryApprovalGate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-2">Sourcing Policy:</span>
                    <span className="font-semibold text-slate-900">{activePid.sourcingAllocationPolicy}</span>
                  </div>
                </div>
              </div>

              {/* TIER 2: Trade Breakdown Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tier 2: Trade-Level Supply Allocation Matrix (Discrete Price Buckets)
                </h3>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] font-semibold tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Trade</th>
                        <th className="py-2.5 px-3 text-right">Items</th>
                        <th className="py-2.5 px-3 text-right">Total Quoted Value (Bucket)</th>
                        <th className="py-2.5 px-3 text-right">Standard Scope (Bucket)</th>
                        <th className="py-2.5 px-3 text-right text-rose-400">Specialised Scope (Bucket)</th>
                        <th className="py-2.5 px-3">Supply Partner Allocation Pool</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.values(activePid.trades).map((tr) => (
                        <tr key={tr.trade} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{tr.trade}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{tr.itemCount}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{renderBucketBadge(tr.totalQuote)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{renderBucketBadge(tr.standardQuote)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {tr.specialisedQuote > 0 ? renderBucketBadge(tr.specialisedQuote) : <span className="text-slate-400 font-mono text-xs">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 font-medium">{tr.vendorPoolStrategy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TIER 3: SKU Registry (Clubbed SKUs by default, toggle for raw lines) */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                    Tier 3: Consolidated SKU Allocation Register (Clubbed by SKU)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Identical SKUs across rooms/elevations are clubbed into single aggregated lines. Prices are classified into discrete value bands (not per-sqft rates).
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSkuViewMode("clubbed")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        skuViewMode === "clubbed"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Consolidated SKUs ({activePid.clubbedLineItems?.length || activePid.consolidatedSkuCount || activePid.itemCount})
                    </button>
                    <button
                      onClick={() => setSkuViewMode("raw")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        skuViewMode === "raw"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All Quotation Lines ({activePid.lineItems?.length || activePid.itemCount})
                    </button>
                  </div>

                  <input
                    type="text"
                    value={lineSearch}
                    onChange={(e) => setLineSearch(e.target.value)}
                    placeholder="Search SKU or item name..."
                    className="text-xs border border-slate-300 rounded px-2.5 py-1 w-56"
                  />
                </div>

                {/* CLUBBED SKU VIEW */}
                {skuViewMode === "clubbed" && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] font-semibold tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-2.5 text-center">#</th>
                          <th className="py-2 px-2.5 font-mono">SKU</th>
                          <th className="py-2 px-3">SKU / Item Description</th>
                          <th className="py-2 px-2.5">Trade</th>
                          <th className="py-2 px-2 text-center">UOM</th>
                          <th className="py-2 px-2.5 text-right">Consolidated Qty</th>
                          <th className="py-2 px-2.5 text-right">Blended Unit Rate (₹/Qty)</th>
                          <th className="py-2 px-2.5 text-right font-bold text-white">Total Value (Bucket)</th>
                          <th className="py-2 px-2.5 text-center">Scope</th>
                          <th className="py-2 px-2.5">Rate Rule Flag</th>
                          <th className="py-2 px-2.5">Supply Allocation Pool</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {isLoadingItems ? (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-slate-500 text-xs">
                              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1.5 text-slate-400" />
                              Loading Sourcing SKUs...
                            </td>
                          </tr>
                        ) : (activePid.clubbedLineItems || []).length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                              No clubbed SKUs found for this PID.
                            </td>
                          </tr>
                        ) : (
                          (activePid.clubbedLineItems || [])
                            .filter((l) => !lineSearch || l.name.toLowerCase().includes(lineSearch.toLowerCase()) || l.sku.toLowerCase().includes(lineSearch.toLowerCase()))
                            .map((l, i) => (
                            <tr key={l.sku + "_" + i} className="hover:bg-slate-50">
                              <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">{i + 1}</td>
                              <td className="py-2 px-2.5 font-mono font-semibold text-slate-900">{l.sku}</td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-900 text-xs">{l.name}</div>
                                {l.lineCount > 1 && (
                                  <div className="text-[10px] font-medium text-indigo-600">
                                    ★ Consolidated across {l.lineCount} room/elevation lines
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-xs text-slate-700">{l.trade}</td>
                              <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">{l.unit}</td>
                              <td className="py-2 px-2.5 text-right font-mono font-semibold">{l.quantity}</td>
                              <td className="py-2 px-2.5 text-right font-mono">₹{Math.round(l.unitPrice).toLocaleString("en-IN")}</td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold">
                                {renderBucketBadge(l.priceBucket || l.preTaxPrice)}
                              </td>
                              <td className="py-2 px-2.5 text-center">{getScopeBadge(l.scopeTag)}</td>
                              <td className="py-2 px-2.5 text-[11px]">
                                {l.rateRuleFlag === "Rate > ₹2k Override" ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                    Rate &gt; ₹2k Override
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Standard Rate</span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-[11px] text-slate-700 font-medium">
                                {l.sourcingAction}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* RAW LINE ITEM VIEW */}
                {skuViewMode === "raw" && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-96">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] font-semibold tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-2.5 text-center">#</th>
                          <th className="py-2 px-3">Item Description</th>
                          <th className="py-2 px-2.5">Trade</th>
                          <th className="py-2 px-2 text-center">Unit</th>
                          <th className="py-2 px-2.5 text-right">Qty</th>
                          <th className="py-2 px-2.5 text-right">Rate (₹)</th>
                          <th className="py-2 px-2.5 text-right font-bold text-white">Total Value (Bucket)</th>
                          <th className="py-2 px-2.5 text-center">Scope</th>
                          <th className="py-2 px-2.5">Rate Rule Flag</th>
                          <th className="py-2 px-2.5">Supply Allocation Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {isLoadingItems ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1.5 text-slate-400" />
                              Loading All Quotation Lines...
                            </td>
                          </tr>
                        ) : (activePid.lineItems || []).length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                              No quotation lines found for this PID.
                            </td>
                          </tr>
                        ) : (
                          (activePid.lineItems || [])
                            .filter((l) => !lineSearch || (l.cleanName && l.cleanName.toLowerCase().includes(lineSearch.toLowerCase())) || (l.sku && l.sku.toLowerCase().includes(lineSearch.toLowerCase())))
                            .map((l, i) => (
                            <tr key={l.lineId || i} className="hover:bg-slate-50">
                              <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[10px]">{i + 1}</td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-900 text-xs">{l.cleanName}</div>
                                {l.sku && <div className="text-[10px] font-mono text-slate-400">SKU: {l.sku}</div>}
                              </td>
                              <td className="py-2 px-2.5 text-xs text-slate-700">{l.trade}</td>
                              <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">{l.unit}</td>
                              <td className="py-2 px-2.5 text-right font-mono">{l.quantity}</td>
                              <td className="py-2 px-2.5 text-right font-mono">₹{Math.round(l.unitPrice).toLocaleString("en-IN")}</td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold">
                                {renderBucketBadge(l.preTaxPrice)}
                              </td>
                              <td className="py-2 px-2.5 text-center">{getScopeBadge(l.scopeTag)}</td>
                              <td className="py-2 px-2.5 text-[11px]">
                                {l.rateRuleFlag === "Rate > ₹2k Override" ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                    Rate &gt; ₹2k Override
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Standard Rate</span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-[11px] text-slate-700 font-medium">
                                {l.sourcingAction}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
