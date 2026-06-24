'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { grievanceService } from '@/services/grievances';

interface Grievance {
    _id: string;
    invoiceId: string;
    salespersonName: string;
    grievanceType: string;
    grievanceDescription: string;
    createdAt: string;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function GrievanceList({ refreshKey }: { refreshKey: number }) {
    const [grievances, setGrievances] = useState<Grievance[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const limit = 5;

    useEffect(() => {
        fetchGrievances();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, refreshKey]);

    const fetchGrievances = async () => {
        setLoading(true);
        try {
            const data = await grievanceService.list(page, limit);
            if (data.success) {
                setGrievances(data.grievances as Grievance[]);
                setPagination(data.pagination as Pagination);
            } else {
                throw new Error(data.error || 'Failed to fetch grievances');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (pagination && page < pagination.totalPages) {
            setPage(page + 1);
        }
    };

    const handlePrev = () => {
        if (page > 1) {
            setPage(page - 1);
        }
    };

    return (
        <div className="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] rounded-xl shadow-sm p-5 max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Grievances</h2>
            
            {loading ? (
                <div className="py-8 text-center text-gray-500">Loading grievances...</div>
            ) : grievances.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border border-dashed border-[#2a2a38] rounded-xl">
                    No grievances found.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-[#1c1c28] text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Date</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Order ID</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Salesperson</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Type</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38] w-1/3">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a38]">
                            {grievances.map((g) => (
                                <tr key={g._id} className="hover:bg-gray-50/50 dark:hover:bg-[#1c1c28]/50">
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                        {new Date(g.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {g.invoiceId}
                                    </td>
                                    <td className="px-4 py-3 capitalize text-gray-700 dark:text-gray-300">
                                        {g.salespersonName}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        <span className="bg-gray-100 dark:bg-[#2a2a38] px-2 py-1 rounded text-xs font-medium">
                                            {g.grievanceType === 'amount_gt_2000' ? 'Amount > 2000' :
                                             g.grievanceType === 'need_solution' ? 'Need Solution' :
                                             g.grievanceType === 'order_returned' ? 'Order Returned' :
                                             g.grievanceType === 'invoice_deleted_updation_failed' ? '⚠ Invoice Update Failed' :
                                             g.grievanceType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                                        {g.grievanceDescription}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-[#2a2a38]">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Showing page {page} of {pagination.totalPages} ({pagination.total} total)
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrev}
                            disabled={page === 1 || loading}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-[#16161f] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-[#2a2a38] rounded hover:bg-gray-50 dark:hover:bg-[#1c1c28] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={page >= pagination.totalPages || loading}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-[#16161f] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-[#2a2a38] rounded hover:bg-gray-50 dark:hover:bg-[#1c1c28] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
