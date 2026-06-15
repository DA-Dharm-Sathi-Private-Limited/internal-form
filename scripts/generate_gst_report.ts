import fs from 'fs';
import path from 'path';

// Helper to parse CSV
function parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentField = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(currentField);
                currentField = '';
            } else if (char === '\n' || char === '\r') {
                row.push(currentField);
                result.push(row);
                row = [];
                currentField = '';
                if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                    i++;
                }
            } else {
                currentField += char;
            }
        }
    }
    if (row.length > 0 || currentField) {
        row.push(currentField);
        result.push(row);
    }
    return result;
}

function stringifyCSV(data: string[][]): string {
    return data.map(row => 
        row.map(field => {
            if (field == null) return '';
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    ).join('\n');
}

async function main() {
    const inputFile = path.join(process.cwd(), 'item_level_invoice_data.csv');
    const outputFile = path.join(process.cwd(), 'gst_report.csv');

    if (!fs.existsSync(inputFile)) {
        console.error('Input file not found:', inputFile);
        return;
    }

    const csvData = fs.readFileSync(inputFile, 'utf-8');
    const rows = parseCSV(csvData);

    if (rows.length < 2) {
        console.error('Not enough data in CSV');
        return;
    }

    const headers = rows[0];
    const dateIdx = headers.indexOf('Invoice Date');
    const priceIdx = headers.indexOf('Price of Each Item');
    const taxIdx = headers.indexOf('Tax of Each Item');
    const categoryIdx = headers.indexOf('Category of Each Item');

    if (dateIdx === -1 || priceIdx === -1 || taxIdx === -1 || categoryIdx === -1) {
        console.error('Missing required columns in CSV');
        return;
    }

    // Data structure to hold aggregation:
    // map[category_taxRate][month] = { taxable: number, tax: number }
    const reportData: Record<string, Record<string, { taxable: number, tax: number }>> = {};
    const monthsFound = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length <= Math.max(dateIdx, priceIdx, taxIdx, categoryIdx)) continue;

        const dateStr = row[dateIdx];
        if (!dateStr || !dateStr.includes('/2026')) continue; // Only keep 2026

        // Parse date DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length < 3) continue;
        const monthNum = parseInt(parts[1], 10);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = monthNames[monthNum - 1];
        if (!monthName) continue;

        monthsFound.add(monthName);

        const price = parseFloat(row[priceIdx]) || 0;
        const tax = parseFloat(row[taxIdx]) || 0;
        const category = row[categoryIdx]?.trim() || 'Unknown';

        // Tax is inclusive: Price = Taxable + Tax
        // Tax Rate = Tax / Taxable
        const taxable = price - tax;
        let taxRate = 0;
        if (taxable > 0 && tax > 0) {
            taxRate = Math.round((tax / taxable) * 10000) / 100;
        } else if (tax > 0 && taxable <= 0) {
            taxRate = 100; // Edge case
        }

        const key = `${category}|${taxRate}`;
        
        if (!reportData[key]) {
            reportData[key] = {};
        }
        if (!reportData[key][monthName]) {
            reportData[key][monthName] = { taxable: 0, tax: 0 };
        }
        
        reportData[key][monthName].taxable += taxable;
        reportData[key][monthName].tax += tax;
    }

    // Sort months chronologically
    const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortedMonths = allMonths.filter(m => monthsFound.has(m));

    // Prepare CSV rows
    const outRows: string[][] = [];
    
    // Header
    const headerRow = ['Category', 'Tax %'];
    for (const m of sortedMonths) {
        headerRow.push(`${m}-2026 Taxable`, `${m}-2026 Tax Amount`);
    }
    headerRow.push('Grand Total Taxable', 'Grand Total Tax Amount');
    outRows.push(headerRow);

    // Sort keys alphabetically by category, then by tax rate
    const sortedKeys = Object.keys(reportData).sort((a, b) => {
        const [catA, taxA] = a.split('|');
        const [catB, taxB] = b.split('|');
        if (catA !== catB) return catA.localeCompare(catB);
        return parseFloat(taxA) - parseFloat(taxB);
    });

    let grandTotalTaxableOverall = 0;
    let grandTotalTaxOverall = 0;
    const monthTotals: Record<string, { taxable: number, tax: number }> = {};
    for (const m of sortedMonths) {
        monthTotals[m] = { taxable: 0, tax: 0 };
    }

    for (const key of sortedKeys) {
        const [category, taxRate] = key.split('|');
        const rowData = [category, `${taxRate}%`];
        
        let rowTotalTaxable = 0;
        let rowTotalTax = 0;

        for (const m of sortedMonths) {
            const vals = reportData[key][m] || { taxable: 0, tax: 0 };
            rowData.push(vals.taxable.toFixed(2), vals.tax.toFixed(2));
            rowTotalTaxable += vals.taxable;
            rowTotalTax += vals.tax;
            
            monthTotals[m].taxable += vals.taxable;
            monthTotals[m].tax += vals.tax;
        }

        rowData.push(rowTotalTaxable.toFixed(2), rowTotalTax.toFixed(2));
        outRows.push(rowData);

        grandTotalTaxableOverall += rowTotalTaxable;
        grandTotalTaxOverall += rowTotalTax;
    }

    // Grand Totals Row
    const totalsRow = ['GRAND TOTAL', ''];
    for (const m of sortedMonths) {
        totalsRow.push(monthTotals[m].taxable.toFixed(2), monthTotals[m].tax.toFixed(2));
    }
    totalsRow.push(grandTotalTaxableOverall.toFixed(2), grandTotalTaxOverall.toFixed(2));
    outRows.push(totalsRow);

    fs.writeFileSync(outputFile, stringifyCSV(outRows));
    console.log(`GST Report generated successfully at: ${outputFile}`);
}

main().catch(console.error);
