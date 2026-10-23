import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { getPriceBucket } from '@/lib/price-buckets';

const GZ_PATH = path.join(process.cwd(), 'lib', 'data', 'pid_governance_items_map.json.gz');
const JSON_PATH = path.join(process.cwd(), 'lib', 'data', 'pid_governance_items_map.json');
let cachedMap: Record<string, any> | null = null;

function loadMap(): Record<string, any> {
  if (cachedMap) return cachedMap;
  if (fs.existsSync(GZ_PATH)) {
    const raw = zlib.gunzipSync(fs.readFileSync(GZ_PATH)).toString('utf8');
    cachedMap = JSON.parse(raw);
    return cachedMap!;
  }
  if (fs.existsSync(JSON_PATH)) {
    cachedMap = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    return cachedMap!;
  }
  return {};
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('pid');
    if (!pid) {
      return NextResponse.json({ error: 'Missing pid parameter' }, { status: 400 });
    }

    const map = loadMap();
    const pidData = map[pid] || { clubbedLineItems: [], lineItems: [] };

    const enrichItem = (item: any) => ({
      ...item,
      priceBucket: item.priceBucket || getPriceBucket(item.preTaxPrice || 0),
      rateRuleFlag: item.rateRuleFlag || (item.unitPrice > 2000 ? 'Rate > ₹2k Override' : 'Standard Rate'),
      sourcingAction: item.sourcingAction || (item.scopeTag === 'Specialised' ? `Specialist ${item.trade} Contractor Pool` : `Standard ${item.trade} Contractor Pool`),
    });

    return NextResponse.json({
      clubbedLineItems: (pidData.clubbedLineItems || []).map(enrichItem),
      lineItems: (pidData.lineItems || []).map(enrichItem),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
