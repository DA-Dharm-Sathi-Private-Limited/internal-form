'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';

export default function ExportDataPage() {
    // Determine the max date (today) in local timezone
    const now = new Date();
    // Offset local timezone explicitly to ensure correct 'today' date string
    const offset = now.getTimezoneOffset();
    const todayStr = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

    const minDate = '2026-07-01';
    
    const [from, setFrom] = useState(minDate);
    const [to, setTo] = useState(todayStr);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        if (!from || !to) {
            setError('Please select both start and end dates.');
            return;
        }

        if (from < minDate) {
            setError('Start date cannot be before July 1, 2026.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/export-data?from=${from}&to=${to}`);
            
            if (!res.ok) {
                let errorMsg = 'Failed to export data';
                try {
                    const data = await res.json();
                    errorMsg = data.error || errorMsg;
                } catch {
                    // ignore
                }
                throw new Error(errorMsg);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `item_level_invoice_data_${from}_to_${to}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border)] shadow-sm">
                <div className="flex flex-col gap-2 mb-8">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Export Data</h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Export item-level invoice data into a CSV format. The start date cannot be before July 1, 2026.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[var(--text-primary)]">Start Date</label>
                        <input
                            type="date"
                            value={from}
                            min={minDate}
                            max={to}
                            onChange={(e) => setFrom(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold text-[var(--text-primary)]">End Date</label>
                        <input
                            type="date"
                            value={to}
                            min={from}
                            max={todayStr}
                            onChange={(e) => setTo(e.target.value)}
                            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm border border-red-500/20 font-medium">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleExport}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 py-3 rounded-xl bg-[var(--accent)] hover:bg-opacity-90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Exporting Data...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            <span>Download CSV</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
