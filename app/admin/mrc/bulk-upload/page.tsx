"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import * as xlsx from "xlsx";
import { UploadCloud, AlertCircle, CheckCircle2, FileUp, Loader2, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

type SystemData = {
  categories: { id: string; name: string }[];
  subCategories: { id: string; name: string; category_id: string }[];
  cities: { id: string; name: string; code: string }[];
};

type ValidatedRow = {
  original: any;
  parsed: any;
  errors: string[];
};

export default function BulkUploadPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loadingSys, setLoadingSys] = useState(true);
  const [sysData, setSysData] = useState<SystemData>({ categories: [], subCategories: [], cities: [] });
  
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      const [catsRes, subsRes, citiesRes] = await Promise.all([
        supabase.from("mrc_categories").select("id, name"),
        supabase.from("mrc_sub_categories").select("id, name, category_id"),
        supabase.from("app_cities").select("id, name, code").eq("is_active", true)
      ]);
      
      setSysData({
        categories: catsRes.data || [],
        subCategories: subsRes.data || [],
        cities: citiesRes.data || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSys(false);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = xlsx.utils.sheet_to_json(sheet);
        
        validateAndSetRows(jsonRows);
      } catch (err) {
        alert("Failed to parse file. Make sure it's a valid Excel or CSV.");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const validateAndSetRows = (jsonRows: any[]) => {
    const validated = jsonRows.map((r: any) => {
      const code = String(r.sku_code || '').trim();
      const catName = String(r.category || '').trim();
      const subCatName = String(r.sub_category || '').trim();
      const cityName = String(r.city || '').trim();

      const cityObj = sysData.cities.find(c => 
        c.name.toLowerCase() === cityName.toLowerCase() || 
        c.code.toLowerCase() === cityName.toLowerCase()
      );
      const catObj = sysData.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      const subCatObj = sysData.subCategories.find(sc => 
        sc.name.toLowerCase() === subCatName.toLowerCase() && 
        sc.category_id === catObj?.id
      );

      const errors = [];
      if (!code) errors.push("Missing sku_code");
      if (!r.sku_name) errors.push("Missing sku_name");
      if (!catObj) errors.push(`Unknown Category '${catName}'`);
      if (!subCatObj) errors.push(`Unknown/Mismatched SubCat '${subCatName}'`);
      if (!cityObj) errors.push(`Unknown City '${cityName}'`);
      if (!r.unit) errors.push("Missing unit");
      if (!r.rate || isNaN(parseFloat(r.rate))) errors.push("Invalid rate");

      return {
        original: r,
        errors,
        parsed: {
          sku_code: code,
          sku_name: String(r.sku_name || '').trim(),
          category_id: catObj?.id,
          sub_category_id: subCatObj?.id,
          city_id: cityObj?.id,
          unit: String(r.unit || 'SqFt').trim(),
          service_on: r.service_on ? String(r.service_on).trim() : null,
          rate: parseFloat(r.rate) || 0,
          description: r.description ? String(r.description).trim() : null,
          brand_specification: r.brand_specification ? String(r.brand_specification).trim() : null,
          is_active: true
        }
      };
    });

    setRows(validated);
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    // Use batch upsert logic
    // For large datasets, split into chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize).map(r => r.parsed);
      const { error } = await supabase
        .from("mrc_items")
        .upsert(chunk, { onConflict: "sku_code, city_id" }); // Handle duplicates by updating

      if (error) {
        console.error("Batch error:", error);
        failCount += chunk.length;
      } else {
        successCount += chunk.length;
      }
    }

    setResults({ success: successCount, failed: failCount });
    setImporting(false);
  };

  if (loadingSys) {
     return <div className="flex p-12 justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const validCount = rows.filter(r => r.errors.length === 0).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <Link href="/admin/mrc" className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center mb-2 w-max">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Categories
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Bulk Import SKUs</h1>
          <p className="text-sm text-slate-500 mt-1">Upload multiple MRC Line Items using Excel or CSV.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-blue-600" />
              Upload Source File
            </h2>
            
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
              <p className="font-medium text-slate-700">Click to select file</p>
              <p className="text-xs text-slate-500 mt-1">Accepts .xlsx, .xls, .csv</p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            {file && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm flex items-center space-x-2 border border-blue-100">
                <FileUp className="w-4 h-4" />
                <span className="truncate">{file.name}</span>
              </div>
            )}
            
            <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Required Columns</h3>
              <ul className="text-sm text-slate-600 font-mono space-y-1">
                <li>sku_code</li>
                <li>sku_name</li>
                <li>category</li>
                <li>sub_category</li>
                <li>city</li>
                <li>unit</li>
                <li>rate</li>
              </ul>
            </div>
          </div>

          {/* Import Actions */}
          {rows.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 pt-5">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-600">Total Rows</span>
                  <span className="text-slate-800">{rows.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-green-600">Valid Rows</span>
                  <span className="text-green-700">{validCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-red-500">Errors</span>
                  <span className="text-red-600">{invalidCount}</span>
                </div>
              </div>

              {results && (
                <div className={`p-4 rounded-lg border mb-6 ${results.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                   <p className={`text-sm font-medium ${results.failed > 0 ? 'text-amber-800' : 'text-green-800'}`}>
                     Import Complete: {results.success} inserted/updated. {results.failed > 0 && `${results.failed} failed.`}
                   </p>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-colors disabled:cursor-not-allowed"
              >
                {importing && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>Import {validCount} Valid Items</span>
              </button>
            </div>
          )}
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
             {rows.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
                 <Package className="w-12 h-12 mb-3 text-slate-200" />
                 <p>Upload a file to preview data</p>
               </div>
             ) : (
               <div className="flex flex-col h-full max-h-[800px]">
                 <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Preview (First 100 rows)</h3>
                 </div>
                 <div className="overflow-auto flex-1 p-0">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 shadow-sm">
                        <tr>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase">SKU Code</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase">Name</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase">Category</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase">City</th>
                          <th className="p-3 text-xs font-semibold text-slate-600 uppercase">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className={`border-b border-slate-100 ${row.errors.length > 0 ? "bg-red-50/50" : "hover:bg-slate-50"}`}>
                            <td className="p-3">
                              {row.errors.length > 0 ? (
                                <div className="group relative">
                                  <AlertCircle className="w-5 h-5 text-red-500" />
                                  <div className="hidden group-hover:block absolute left-8 top-0 bg-white border border-red-200 shadow-lg p-2 rounded-lg z-50 text-xs text-red-600 w-max">
                                    {row.errors.map((e, i) => <div key={i}>• {e}</div>)}
                                  </div>
                                </div>
                              ) : (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              )}
                            </td>
                            <td className="p-3 text-sm font-mono text-slate-700">{row.original.sku_code}</td>
                            <td className="p-3 text-sm text-slate-800">{row.original.sku_name?.substring(0, 30)}{row.original.sku_name?.length > 30 ? '...' : ''}</td>
                            <td className="p-3 text-sm text-slate-600">{row.original.category}</td>
                            <td className="p-3 text-sm text-slate-600">{row.original.city}</td>
                            <td className="p-3 text-sm font-medium text-slate-800">{row.original.rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
