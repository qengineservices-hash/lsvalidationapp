import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const DATA_PATH = path.join(process.cwd(), 'lib', 'data', 'pid_governance_data.json');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return NextResponse.json({ error: 'No cached governance data found. Please trigger a sync.' }, { status: 404 });
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json({
      success: true,
      syncMetadata: data.syncMetadata,
      portfolio: data.portfolio,
      totalPids: data.pids?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'sync_pid_governance.js');
    const { stdout, stderr } = await execPromise(`NODE_PATH=${path.join(process.cwd(), 'node_modules')} node "${scriptPath}"`);
    
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf8');
      const data = JSON.parse(raw);
      return NextResponse.json({
        success: true,
        message: 'Live Google Sheets synchronization completed successfully.',
        syncMetadata: data.syncMetadata,
        portfolio: data.portfolio,
        totalPids: data.pids?.length || 0,
        logs: stdout,
      });
    }

    return NextResponse.json({ success: true, stdout, stderr });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
