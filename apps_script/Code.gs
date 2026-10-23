/**
 * PID Supply Governance & Contractor Allocation Web App
 * Google Apps Script Backend (Code.gs)
 * 
 * Target Workbook: 1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno
 * Tab: Inhouse_Clean_Staging
 */

var SPREADSHEET_ID = "1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno";
var STAGING_TAB_NAME = "Inhouse_Clean_Staging";

/**
 * Discrete Price Bucketing
 */
function getPriceBucket(value) {
  var v = Number(value) || 0;
  if (v <= 0) return 'Less than 25K';
  if (v < 25000) return 'Less than 25K';
  if (v < 50000) return '25-50K';
  if (v < 100000) return '50K-1L';
  if (v < 200000) return '1-2L';
  if (v < 300000) return '2-3L';
  if (v < 400000) return '3-4L';
  if (v < 500000) return '4-5L';
  return '5L+';
}

/**
 * Serves the HTML Web App UI
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialPid = (e && e.parameter && e.parameter.pid) ? e.parameter.pid : '4019066';
  return template.evaluate()
    .setTitle('PID Supply Governance & Allocation | Livspace')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetch list of available PIDs with metadata for quick search/autocomplete
 */
function getPidList() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAGING_TAB_NAME);
    if (!sheet) return { error: "Staging tab not found" };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { pids: [] };

    var range = sheet.getRange(2, 1, Math.min(lastRow - 1, 15000), 13);
    var values = range.getValues();

    var pidMap = {};
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var pid = String(row[0]).trim();
      if (!pid || pidMap[pid]) continue;
      pidMap[pid] = {
        pid: pid,
        city: String(row[11] || '').trim(),
        bu: String(row[12] || '').trim()
      };
    }

    var list = Object.keys(pidMap).map(function(k) { return pidMap[k]; });
    return { success: true, pids: list };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Fetch detailed governance report for a specific PID
 */
function getProjectGovernanceReport(pidInput) {
  try {
    if (!pidInput) return { error: "Missing PID" };
    var targetPid = String(pidInput).trim();

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(STAGING_TAB_NAME);
    if (!sheet) return { error: "Staging sheet not found" };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { error: "No data in staging tab" };

    // Cols A to P:
    // A: PID, B: created_at, C: sku, D: name, E: qty, F: preTax, G: unitRate,
    // H: trade, I: scopeTag, J: rateRule, K: pool, L: city, M: BU, N: vendor,
    // O: raw_name, P: priceBucket
    var data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();

    var matchedRows = [];
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === targetPid) {
        matchedRows.push(data[i]);
      }
    }

    if (matchedRows.length === 0) {
      return { success: false, error: "PID " + targetPid + " not found in 2026 dataset." };
    }

    var meta = {
      pid: targetPid,
      city: String(matchedRows[0][11] || 'Unknown'),
      bu: String(matchedRows[0][12] || 'Select'),
      vendor: String(matchedRows[0][13] || 'Inhouse Services'),
      publishedAt: matchedRows[0][1] ? String(matchedRows[0][1]) : '',
      totalLines: matchedRows.length,
      totalServicesQuote: 0,
      standardScopeQuote: 0,
      specialisedScopeQuote: 0,
      rateOverrideCount: 0,
      rateOverrideQuote: 0,
      trades: {
        'Carpentry': { trade: 'Carpentry', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Carpentry Pool' },
        'Civil': { trade: 'Civil', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Civil Pool' },
        'Electrical': { trade: 'Electrical', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Electrician Pool' },
        'Plumbing': { trade: 'Plumbing', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Plumber Pool' },
        'False Ceiling': { trade: 'False Ceiling', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard False Ceiling Pool' },
        'Painting': { trade: 'Painting', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Painter Pool' }
      }
    };

    var clubMap = {};
    var rawLines = [];

    for (var j = 0; j < matchedRows.length; j++) {
      var r = matchedRows[j];
      var sku = String(r[2] || '');
      var cleanName = String(r[3] || '');
      var qty = Number(r[4]) || 1;
      var preTax = Number(r[5]) || 0;
      var unitRate = Number(r[6]) || (qty > 0 ? preTax / qty : preTax);
      var trade = String(r[7] || 'Civil');
      var scopeTag = String(r[8] || 'Standard');
      var rateRule = String(r[9] || 'Standard Rate');
      var pool = String(r[10] || '');

      meta.totalServicesQuote += preTax;
      if (scopeTag === 'Specialised') {
        meta.specialisedScopeQuote += preTax;
      } else {
        meta.standardScopeQuote += preTax;
      }

      if (rateRule.indexOf('Override') !== -1 || unitRate > 2000) {
        meta.rateOverrideCount++;
        meta.rateOverrideQuote += preTax;
      }

      if (!meta.trades[trade]) {
        meta.trades[trade] = { trade: trade, itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Pool' };
      }
      var tObj = meta.trades[trade];
      tObj.itemCount++;
      tObj.totalQuote += preTax;
      if (scopeTag === 'Specialised') {
        tObj.specialisedQuote += preTax;
        tObj.vendorPoolStrategy = 'Specialist ' + trade + ' Partner Allocation Required';
      } else {
        tObj.standardQuote += preTax;
      }

      // SKU Clubbing
      var clubKey = cleanName.toLowerCase().trim() + '||' + trade;
      if (!clubMap[clubKey]) {
        clubMap[clubKey] = {
          name: cleanName,
          sku: sku,
          trade: trade,
          unit: 'Qty',
          quantity: 0,
          totalValue: 0,
          scopeTag: scopeTag,
          rateRuleFlag: rateRule,
          sourcingAction: pool,
          lineCount: 0
        };
      }
      var cItem = clubMap[clubKey];
      cItem.quantity += qty;
      cItem.totalValue += preTax;
      cItem.lineCount++;
      if (scopeTag === 'Specialised') cItem.scopeTag = 'Specialised';
      if (rateRule.indexOf('Override') !== -1) cItem.rateRuleFlag = 'Rate > ₹2k Override';

      rawLines.push({
        sku: sku,
        cleanName: cleanName,
        trade: trade,
        unit: 'Qty',
        quantity: qty,
        unitPrice: Math.round(unitRate),
        preTaxPrice: Math.round(preTax),
        priceBucket: getPriceBucket(preTax),
        scopeTag: scopeTag,
        rateRuleFlag: rateRule,
        sourcingAction: pool
      });
    }

    var clubbedList = Object.keys(clubMap).map(function(k) {
      var item = clubMap[k];
      var blendedRate = item.quantity > 0 ? item.totalValue / item.quantity : item.totalValue;
      return {
        name: item.name,
        sku: item.sku,
        trade: item.trade,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: Math.round(blendedRate),
        totalValue: Math.round(item.totalValue),
        priceBucket: getPriceBucket(item.totalValue),
        scopeTag: item.scopeTag,
        rateRuleFlag: item.rateRuleFlag,
        sourcingAction: item.scopeTag === 'Specialised' ? 'Specialist ' + item.trade + ' Contractor Pool' : 'Standard ' + item.trade + ' Contractor Pool',
        lineCount: item.lineCount
      };
    });

    // Sort clubbed items by total value descending
    clubbedList.sort(function(a, b) { return b.totalValue - a.totalValue; });

    // Bucketing for summary
    meta.totalBoqBucket = getPriceBucket(meta.totalServicesQuote);
    meta.standardBucket = getPriceBucket(meta.standardScopeQuote);
    meta.specialisedBucket = getPriceBucket(meta.specialisedScopeQuote);
    meta.rateOverrideBucket = getPriceBucket(meta.rateOverrideQuote);
    meta.consolidatedSkuCount = clubbedList.length;

    meta.sourcingAllocationPolicy = meta.specialisedScopeQuote > 0
      ? 'Specialist Trade Vendor Allocation Required'
      : 'Standard Contractor Allocation Permitted';

    // Format Trade buckets
    Object.keys(meta.trades).forEach(function(k) {
      var tr = meta.trades[k];
      tr.totalQuoteBucket = getPriceBucket(tr.totalQuote);
      tr.standardQuoteBucket = getPriceBucket(tr.standardQuote);
      tr.specialisedQuoteBucket = tr.specialisedQuote > 0 ? getPriceBucket(tr.specialisedQuote) : '—';
    });

    return {
      success: true,
      meta: meta,
      clubbedItems: clubbedList,
      rawLines: rawLines
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
