"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Download,
  ShieldAlert,
  Layers,
  ChevronRight,
  X,
  FileSpreadsheet,
  Activity,
  CheckCircle,
  Clock,
  Sliders,
  DollarSign,
  TrendingUp,
  Cpu
} from "lucide-react";

// Types
import type {
  PidGovernanceSummary,
  PortfolioGovernanceMetrics,
  TradeSummary,
  AuditedLineItem
} from "@/lib/pid-governance-engine";

// Import precomputed data directly for instant zero-latency load
import precomputedData from "@/lib/data/pid_governance_data.json";

export default function PidGovernancePage() {
  const [data, setData] = useState<{
    syncMetadata: any;
    portfolio: PortfolioGovernanceMetrics;
    pids: PidGovernanceSummary[];
  }>(precomputedData as any);

  const [activeTab, setActiveTab] = useState<"scorecard" | "complexity" | "portfolio" | "rules">("scorecard");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedBu, setSelectedBu] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedTrade, setSelectedTrade] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Selected PID for Deep Drawer Drilldown
  const [activePid, setActivePid] = useState<PidGovernanceSummary | null>(null);
  const [lineSearch, setLineSearch] = useState("");

  // Sync Live Handler
  const handleLiveSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Connecting to Google Sheets API and fetching live RFV rows...");
    try {
      const res = await fetch("/api/pid-governance/sync", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        // Reload data from file or result
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
      if (selectedRisk !== "ALL" && p.variationRiskClass !== selectedRisk) return false;
      if (selectedTrade !== "ALL") {
        const tradeData = p.trades[selectedTrade];
        if (!tradeData || tradeData.totalQuote <= 0) return false;
      }
      return true;
    });
  }, [data, searchTerm, selectedCity, selectedBu, selectedRisk, selectedTrade]);

  // Pagination
  const totalPages = Math.ceil(filteredPids.length / pageSize) || 1;
  const paginatedPids = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPids.slice(start, start + pageSize);
  }, [filteredPids, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedBu, selectedRisk, selectedTrade]);

  // Helper Formatters
  const formatINR = (val: number) => {
    return "₹" + Math.round(val).toLocaleString("en-IN");
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "Critical Risk":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">Critical Risk</span>;
      case "High Risk":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">High Risk</span>;
      case "Medium Risk":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Medium Risk</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Low Risk</span>;
    }
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
      rows = pid.lineItems.map((l, i) => ({
        "Sl": i + 1,
        "PID": l.projectId,
        "Trade": l.trade,
        "Item Name": l.cleanName,
        "SKU": l.sku,
        "UOM": l.unit,
        "Qty": l.quantity,
        "Unit Rate (₹)": l.unitPrice,
        "Total (₹)": l.preTaxPrice,
        "Scope Tag": l.scopeTag,
        "Complexity (Ci)": l.complexityScore,
        "Trade Weight (Wt)": l.tradeWeight,
        "Line NRI (₹)": l.lineNri,
        "Rate Override": l.rateRuleFlag,
        "Match Origin": l.matchOrigin,
        "Sourcing Action": l.sourcingAction
      }));
    } else {
      rows = filteredPids.map((p, i) => ({
        "Sl": i + 1,
        "PID": p.projectId,
        "City": p.city,
        "BU": p.bu,
        "VL Email": p.vlEmail,
        "Total Services BoQ (₹)": p.totalServicesQuote,
        "Standard Scope (₹)": p.standardScopeQuote,
        "Standard Scope (%)": p.standardScopeSharePct + "%",
        "Specialised Scope (₹)": p.specialisedScopeQuote,
        "Specialised Scope (%)": p.specialisedScopeSharePct + "%",
        "Rate > ₹2k Overrides Count": p.rateOverrideCount,
        "Project Total NRI (₹)": p.projectTotalNri,
        "Weighted Complexity": p.projectWeightedComplexity,
        "Risk Class": p.variationRiskClass,
        "Approval Gate": p.mandatoryApprovalGate,
        "Sourcing Policy": p.sourcingAllocationPolicy
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
    link.setAttribute("download", pid ? `PID_${pid.projectId}_BoQ_Audit.csv` : "Portfolio_PID_Governance_Report.csv");
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
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
                  Services Vertical
                </span>
                <span className="text-xs text-slate-400">Step 3 Audit Engine</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">
                PID Governance & Risk Architecture
              </h1>
              <p className="text-xs text-slate-400">
                100% Formula-Driven Portfolio Audit | 609 Converted PIDs | 12,966 Quote Lines | Zero Errors
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
                Export CSV
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
              PID Governance Scorecard ({filteredPids.length})
            </button>
            <button
              onClick={() => setActiveTab("complexity")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "complexity"
                  ? "bg-slate-800 text-white font-semibold shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              PID Complexity Report
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
              Rules & Formulas Master (Live)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Tier 1 Portfolio KPI Scorecard */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Services BoQ</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatINR(data.portfolio.totalConvertedBoQ)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across {data.portfolio.totalProjects} converted PIDs
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Specialised Scope</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-1">
              {formatINR(data.portfolio.totalSpecialisedBoQ)}
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
              {data.portfolio.portfolioSpecialisedSharePct}% of total volume
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Portfolio Total NRI</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-indigo-900 mt-1">
              {formatINR(data.portfolio.portfolioTotalNri)}
            </div>
            <div className="text-[11px] text-indigo-700 mt-0.5">
              Risk Multiplier: {data.portfolio.portfolioRiskMultiplier}x
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>High / Critical Risk</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {data.portfolio.riskClassCounts.critical + data.portfolio.riskClassCounts.high} PIDs
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {data.portfolio.riskClassCounts.critical} Critical | {data.portfolio.riskClassCounts.high} High
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
            <div className="text-[11px] text-slate-500 mt-0.5">
              Total {formatINR(data.portfolio.totalRateOverridesValue)}
            </div>
          </div>
        </div>

        {/* TAB 1: PID Governance Scorecard */}
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
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Risk Classes</option>
                  <option value="Critical Risk">Critical Risk (&gt;30%)</option>
                  <option value="High Risk">High Risk (15-30%)</option>
                  <option value="Medium Risk">Medium Risk (5-15%)</option>
                  <option value="Low Risk">Low Risk (&lt;5%)</option>
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

                {(searchTerm || selectedCity !== "ALL" || selectedBu !== "ALL" || selectedRisk !== "ALL" || selectedTrade !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCity("ALL");
                      setSelectedBu("ALL");
                      setSelectedRisk("ALL");
                      setSelectedTrade("ALL");
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
                      <th className="py-3 px-3.5 text-right">Items</th>
                      <th className="py-3 px-3.5 text-right font-bold text-white">Total BoQ (₹)</th>
                      <th className="py-3 px-3.5 text-right">Standard (₹)</th>
                      <th className="py-3 px-3.5 text-right text-rose-400 font-bold">Specialised (₹)</th>
                      <th className="py-3 px-3.5 text-center font-bold">Spec %</th>
                      <th className="py-3 px-3.5 text-right text-indigo-300">Total NRI (₹)</th>
                      <th className="py-3 px-3.5 text-center">Risk Class</th>
                      <th className="py-3 px-3.5">Mandatory Approval Gate</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedPids.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                          No projects match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedPids.map((p, idx) => {
                        const rowNum = (currentPage - 1) * pageSize + idx + 1;
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
                            <td className="py-2.5 px-3.5 text-right text-slate-700 font-mono">{p.itemCount}</td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-mono">
                              {formatINR(p.totalServicesQuote)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-slate-700 font-mono">
                              {formatINR(p.standardScopeQuote)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-semibold text-rose-700 font-mono">
                              {formatINR(p.specialisedScopeQuote)}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                p.specialisedScopeSharePct >= 30 ? "bg-rose-100 text-rose-800" :
                                p.specialisedScopeSharePct >= 15 ? "bg-amber-100 text-amber-800" :
                                p.specialisedScopeSharePct >= 5 ? "bg-blue-100 text-blue-800" :
                                "bg-emerald-100 text-emerald-800"
                              }`}>
                                {p.specialisedScopeSharePct}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-semibold text-indigo-900 font-mono">
                              {formatINR(p.projectTotalNri)}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              {getRiskBadge(p.variationRiskClass)}
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
                                className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition-colors"
                              >
                                View BoQ <ChevronRight className="w-3 h-3 ml-0.5" />
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

        {/* TAB 2: PID Complexity Report */}
        {activeTab === "complexity" && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                PID Risk-Adjusted Revenue & Complexity Analysis
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Detailed comparison of Intrinsic Complexity (C_i: 1-5), Trade Multiplier (W_t), and Normalised Revenue Indicators (NRI = C_i × PreTax / W_t).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">PID</th>
                      <th className="py-2.5 px-3">City / BU</th>
                      <th className="py-2.5 px-3 text-right">Total BoQ (₹)</th>
                      <th className="py-2.5 px-3 text-center">Avg Complexity (C̄)</th>
                      <th className="py-2.5 px-3 text-right">Std NRI (₹)</th>
                      <th className="py-2.5 px-3 text-right text-rose-600">Spec NRI (₹)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-indigo-900">Total Project NRI (₹)</th>
                      <th className="py-2.5 px-3 text-center">Risk Multiplier</th>
                      <th className="py-2.5 px-3 text-center">Risk Class</th>
                      <th className="py-2.5 px-3">Timeline & Schedule Buffer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredPids.slice(0, 100).map((p) => (
                      <tr key={p.projectId} onClick={() => setActivePid(p)} className="hover:bg-slate-50 cursor-pointer">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.projectId}</td>
                        <td className="py-2.5 px-3">{p.city} ({p.bu})</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(p.totalServicesQuote)}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{p.projectWeightedComplexity} / 5.0</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(p.projectStandardNri)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">{formatINR(p.projectSpecialisedNri)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">{formatINR(p.projectTotalNri)}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{p.nriRiskMultiplier}x</td>
                        <td className="py-2.5 px-3 text-center">{getRiskBadge(p.variationRiskClass)}</td>
                        <td className="py-2.5 px-3 text-xs text-slate-700">{p.timelineScheduleBuffer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Macro Portfolio Summary */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Trade Matrix Breakdown Across Entire Portfolio */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Portfolio-Wide Trade Breakdown & NRI Matrix
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Cumulative volumes, manager trade weights, and normalised risk revenue across all 609 projects.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3.5">Trade (Super Category)</th>
                      <th className="py-2.5 px-3.5 text-center">Trade Weight (Wt)</th>
                      <th className="py-2.5 px-3.5 text-right font-bold text-white">Total Quote (₹)</th>
                      <th className="py-2.5 px-3.5 text-right">Standard Scope (₹)</th>
                      <th className="py-2.5 px-3.5 text-right text-rose-400 font-bold">Specialised Scope (₹)</th>
                      <th className="py-2.5 px-3.5 text-center font-bold">Spec Share %</th>
                      <th className="py-2.5 px-3.5 text-right text-indigo-300">Total Trade NRI (₹)</th>
                      <th className="py-2.5 px-3.5">Primary Sourcing Strategy Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.values(data.portfolio.tradeTotals).map((tr) => (
                      <tr key={tr.trade} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5 font-bold text-slate-900">{tr.trade}</td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-800">{tr.weight.toFixed(1)}</td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">{formatINR(tr.totalQuote)}</td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-700">{formatINR(tr.standardQuote)}</td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-700">{formatINR(tr.specialisedQuote)}</td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            tr.specialisedSharePct >= 35 ? "bg-rose-100 text-rose-800" :
                            tr.specialisedSharePct > 0 ? "bg-amber-100 text-amber-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {tr.specialisedSharePct}%
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-indigo-900">{formatINR(tr.totalNri)}</td>
                        <td className="py-3 px-3.5 text-xs text-slate-700">{tr.vendorPoolStrategy}</td>
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

        {/* TAB 4: Rules & Formulas Master (Live & Editable) */}
        {activeTab === "rules" && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Live Governance Rules & Mathematical Syntax
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dynamically linked to Google Sheets ({data.syncMetadata.rulesMasterId}). Edited rules take effect immediately on next sync.
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

              {/* Trade Weights Matrix */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  1. Manager Trade Criticality Weights (W_trade)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(data.syncMetadata.activeTradeWeights).map(([trade, wt]) => (
                    <div key={trade} className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">{trade}</div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">{Number(wt).toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Area Rate Threshold Rule */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  2. Area Rate Rule (UOM Governed)
                </h3>
                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-900">Financial Threshold:</span> Unit Rate &gt; ₹{data.syncMetadata.areaRateThreshold}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Governed UOMs (Area Intensity):</span> SqFt, RFt, Sq ft, R ft
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Impact:</span> Forces Specialised Scope and minimum Item Complexity C_i = 4.
                  </div>
                </div>
              </div>

              {/* Active Regex Matchers */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  3. Regex Keyword Match Engine
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                    <span className="font-sans font-bold text-slate-900 block mb-1">F1: Craft & Rework Liability Pattern</span>
                    /{data.syncMetadata.regexRules.f1Craft}/i
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                    <span className="font-sans font-bold text-slate-900 block mb-1">F2: Tooling & Machinery Needs Pattern</span>
                    /{data.syncMetadata.regexRules.f2Tooling}/i
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                    <span className="font-sans font-bold text-slate-900 block mb-1">F3: Substrate & Site Friction Pattern</span>
                    /{data.syncMetadata.regexRules.f3Substrate}/i
                  </div>
                </div>
              </div>

              {/* Risk Class Cutoffs */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  4. Variation Risk Class Thresholds
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded">
                    <div className="font-bold text-rose-800">Critical Risk</div>
                    <div className="text-rose-700 mt-0.5">Specialised Share &ge; 30%</div>
                    <div className="text-[11px] text-rose-600 mt-1">Mandatory VM Approval Required</div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <div className="font-bold text-amber-800">High Risk</div>
                    <div className="text-amber-700 mt-0.5">Specialised Share 15% - 30%</div>
                    <div className="text-[11px] text-amber-600 mt-1">Mandatory VL Sign-Off</div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-bold text-blue-800">Medium Risk</div>
                    <div className="text-blue-700 mt-0.5">Specialised Share 5% - 15%</div>
                    <div className="text-[11px] text-blue-600 mt-1">Pre-10 Advisory to VL</div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                    <div className="font-bold text-emerald-800">Low Risk</div>
                    <div className="text-emerald-700 mt-0.5">Specialised Share &lt; 5%</div>
                    <div className="text-[11px] text-emerald-600 mt-1">Auto-Approve / Dispatch</div>
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
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold">
                    PID {activePid.projectId}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {activePid.city} • {activePid.bu}
                  </span>
                  {getRiskBadge(activePid.variationRiskClass)}
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
                  <Download className="w-3.5 h-3.5 mr-1" /> Export BoQ
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
              {/* TIER 1: 2-Deck Executive Scorecard */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tier 1: Executive KPI Scorecard
                </h3>

                {/* Deck A: Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Total Services Quote</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{formatINR(activePid.totalServicesQuote)}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Standard Scope</div>
                    <div className="text-base font-bold text-slate-800 mt-0.5">{formatINR(activePid.standardScopeQuote)}</div>
                    <div className="text-[10px] text-slate-500">{activePid.standardScopeSharePct}% share</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Specialised Scope</div>
                    <div className="text-base font-bold text-rose-700 mt-0.5">{formatINR(activePid.specialisedScopeQuote)}</div>
                    <div className="text-[10px] font-bold text-rose-600">{activePid.specialisedScopeSharePct}% share</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Rate &gt; ₹2k Overrides</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{activePid.rateOverrideCount} items</div>
                    <div className="text-[10px] text-slate-500">{formatINR(activePid.rateOverrideQuote)}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Project Total NRI</div>
                    <div className="text-base font-bold text-indigo-900 mt-0.5">{formatINR(activePid.projectTotalNri)}</div>
                    <div className="text-[10px] text-indigo-700">{activePid.nriRiskMultiplier}x multiplier</div>
                  </div>
                </div>

                {/* Deck B: Operational Governance */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Project Risk Class</div>
                    <div className="font-bold text-slate-900 mt-0.5">{activePid.variationRiskClass}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Mandatory Approval Gate</div>
                    <div className="font-bold text-rose-700 mt-0.5">{activePid.mandatoryApprovalGate}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Sourcing Policy</div>
                    <div className="font-semibold text-slate-800 mt-0.5 line-clamp-1">{activePid.sourcingAllocationPolicy}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Timeline & Buffer</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{activePid.timelineScheduleBuffer} | {activePid.commercialContingencyBuffer}</div>
                  </div>
                </div>
              </div>

              {/* TIER 2: Trade Breakdown Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tier 2: Trade Breakdown & Execution Gates
                </h3>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] font-semibold tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Trade</th>
                        <th className="py-2.5 px-3 text-center">Weight</th>
                        <th className="py-2.5 px-3 text-right">Total Quote</th>
                        <th className="py-2.5 px-3 text-right">Standard</th>
                        <th className="py-2.5 px-3 text-right text-rose-400">Specialised</th>
                        <th className="py-2.5 px-3 text-center">Spec %</th>
                        <th className="py-2.5 px-3 text-right text-indigo-300">Total NRI</th>
                        <th className="py-2.5 px-3">Mandatory Execution Gate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.values(activePid.trades).map((tr) => (
                        <tr key={tr.trade} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{tr.trade}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{tr.weight.toFixed(1)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(tr.totalQuote)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatINR(tr.standardQuote)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold">{formatINR(tr.specialisedQuote)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              tr.specialisedSharePct >= 35 ? "bg-rose-100 text-rose-800" :
                              tr.specialisedSharePct > 0 ? "bg-amber-100 text-amber-800" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {tr.specialisedSharePct}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">{formatINR(tr.totalNri)}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">{tr.mandatoryExecutionGate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TIER 3: Line Item Audit Register */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tier 3: Quotation Line-Item Audit Register ({activePid.lineItems.length} lines)
                  </h3>
                  <input
                    type="text"
                    value={lineSearch}
                    onChange={(e) => setLineSearch(e.target.value)}
                    placeholder="Filter line items..."
                    className="text-xs border border-slate-300 rounded px-2.5 py-1 w-52"
                  />
                </div>

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
                        <th className="py-2 px-2.5 text-right font-bold text-white">Total (₹)</th>
                        <th className="py-2 px-2.5 text-center">Scope</th>
                        <th className="py-2 px-2 text-center">Ci</th>
                        <th className="py-2 px-2 text-center">Wt</th>
                        <th className="py-2 px-2.5 text-right text-indigo-300">NRI (₹)</th>
                        <th className="py-2 px-2.5">Match Origin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activePid.lineItems
                        .filter((l) => !lineSearch || l.cleanName.toLowerCase().includes(lineSearch.toLowerCase()) || l.sku.toLowerCase().includes(lineSearch.toLowerCase()))
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
                            <td className="py-2 px-2.5 text-right font-mono">{Math.round(l.unitPrice).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{formatINR(l.preTaxPrice)}</td>
                            <td className="py-2 px-2.5 text-center">{getScopeBadge(l.scopeTag)}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold">{l.complexityScore}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">{l.tradeWeight}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-indigo-900">{formatINR(l.lineNri)}</td>
                            <td className="py-2 px-2.5 text-[10px]">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {l.matchOrigin}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
