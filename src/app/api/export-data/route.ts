import { NextRequest, NextResponse } from 'next/server';
import { generateExportCSV } from '../../../../scripts/export_item_level_invoice_data';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!from || !to) {
            return NextResponse.json({ error: 'Missing from or to dates' }, { status: 400 });
        }

        const csvContent = await generateExportCSV({
            from,
            to,
            noMismatches: true,
        });

        const response = new NextResponse(csvContent);
        response.headers.set('Content-Type', 'text/csv');
        response.headers.set('Content-Disposition', `attachment; filename="item_level_invoice_data_${from}_to_${to}.csv"`);
        return response;
    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
