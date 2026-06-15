import React from 'react';

export interface InvoiceItem {
    item_id?: string;
    name?: string;
    description?: string;
    quantity?: number;
    rate?: number;
    item_total?: number;
    final_price?: number;
    tax_percentage?: number;
    tax_amount?: number;
    hsn_or_sac?: string;
    carat_size?: string;
}

export interface OrderData {
    _id: string;
    orderId: string;
    zohoInvoiceId?: string;
    invoiceTotal?: number | null;
    customerDetails?: {
        customer_name?: string;
        email?: string;
        phone?: string;
        city?: string;
        state?: string;
    };
    astrologerDetails?: {
        astrologerName?: string;
        astrologerNumber?: string;
    };
    invoiceItems?: InvoiceItem[];
    salespersonName?: string;
    paymentMode?: string;
    status?: string;
    createdAt?: string;
    waybill?: string;
    shipments?: {
        waybill?: string;
    }[];
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function getOrderLineSum(order: OrderData): number {
    if (!order.invoiceItems) return 0;
    return order.invoiceItems.reduce((s, i) => s + (i.item_total || 0) + (i.tax_amount || 0), 0);
}

export function getOrderTotal(order: OrderData): number {
    if (order.invoiceTotal != null && Number.isFinite(order.invoiceTotal)) return order.invoiceTotal;
    return getOrderLineSum(order);
}

export function getOrderDiscount(order: OrderData): number {
    if (order.invoiceTotal == null || !Number.isFinite(order.invoiceTotal)) return 0;
    const before = getOrderLineSum(order);
    const discount = before - order.invoiceTotal;
    return discount > 0 ? discount : 0;
}

export default function OrderDetailsExpanded({ order }: { order: OrderData }) {
    const before = getOrderLineSum(order);
    const discount = getOrderDiscount(order);
    const after = getOrderTotal(order);
    const showDiscount = discount > 0.01;

    return (
        <div className="animate-fadeIn mt-2 pl-2 border-l-2 border-indigo-100 dark:border-indigo-900/30">
            {/* Line Items Table */}
            {order.invoiceItems && order.invoiceItems.length > 0 && (
                <div className="overflow-x-auto mb-4 border border-gray-100 dark:border-gray-700/50 rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">Item</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">Qty</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">Rate</th>
                                <th className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {order.invoiceItems.map((item, iIdx) => {
                                const taxInclusiveTotal = (item.item_total || 0) + (item.tax_amount || 0);
                                const taxInclusiveRate = item.final_price || (item.quantity ? taxInclusiveTotal / item.quantity : 0);
                                return (
                                    <tr key={iIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 dark:text-gray-200">{item.name || '—'}</div>
                                            {item.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.quantity ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatCurrency(taxInclusiveRate)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(taxInclusiveTotal)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 space-y-2">
                {showDiscount && (
                    <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700/60 text-sm md:text-base">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Total (before discount)</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(before)}</span>
                    </div>
                )}
                {showDiscount && (
                    <div className="flex justify-between items-center px-3 text-sm md:text-base">
                        <span className="font-medium text-green-700 dark:text-green-400">Discount</span>
                        <span className="font-semibold text-green-700 dark:text-green-400">- {formatCurrency(discount)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30 text-sm md:text-base">
                    <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                        Order Total{showDiscount ? ' (after discount)' : ''}
                    </span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(after)}</span>
                </div>
            </div>
        </div>
    );
}
