'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ordersService } from '@/services/orders';

export default function SyncDailyOrdersButton() {
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
        setLoading(true);
        try {
            const data = await ordersService.syncDaily();
            toast.success((data as { message?: string }).message || 'Orders synced successfully to Google Sheets');
        } catch (err: any) {
            console.error('Sync error:', err);
            toast.error(err.message || 'Error occurred while syncing orders');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button 
            onClick={handleSync}
            disabled={loading}
            className="btn btn-secondary py-2 px-4 text-sm font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? (
                <><span className="btn-spinner border-2 border-emerald-500 border-t-transparent inline-block w-4 h-4 rounded-full animate-spin"></span> Syncing...</>
            ) : (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-5.27l-3.26-1.5"></path><path d="M21.5 8l-5.6 5.6"></path></svg>
                    Sync Daily Orders
                </>
            )}
        </button>
    );
}
