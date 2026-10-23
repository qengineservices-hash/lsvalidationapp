import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUMMARY_PATH = path.join(process.cwd(), 'lib', 'data', 'pid_governance_summary.json');
const FULL_PATH = path.join(process.cwd(), 'lib', 'data', 'pid_governance_data.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const targetPath = fs.existsSync(SUMMARY_PATH) ? SUMMARY_PATH : FULL_PATH;
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'No governance data found.' }, { status: 404 });
    }
    const raw = fs.readFileSync(targetPath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
