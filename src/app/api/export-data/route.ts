import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!from || !to) {
            return NextResponse.json({ error: 'Missing from or to dates' }, { status: 400 });
        }

        const fileName = `export_${Date.now()}_${Math.random().toString(36).substring(7)}.csv`;
        const outputPath = path.join(os.tmpdir(), fileName);

        // Run the script. The script should be modified to avoid showing mismatches if passed --no-mismatches.
        const cmd = `npx tsx scripts/export_item_level_invoice_data.ts --from=${from} --to=${to} --output="${outputPath}" --no-mismatches`;
        
        await execAsync(cmd, { cwd: process.cwd() });

        if (!fs.existsSync(outputPath)) {
            return NextResponse.json({ error: 'Failed to generate CSV file' }, { status: 500 });
        }

        const csvContent = fs.readFileSync(outputPath, 'utf-8');
        fs.unlinkSync(outputPath); // cleanup

        const response = new NextResponse(csvContent);
        response.headers.set('Content-Type', 'text/csv');
        response.headers.set('Content-Disposition', `attachment; filename="item_level_invoice_data_${from}_to_${to}.csv"`);
        return response;
    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
