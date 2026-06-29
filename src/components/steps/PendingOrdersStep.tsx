'use client';

import { useState, useEffect } from 'react';
import type { InvoiceItem, Salesperson } from '@/types/invoice';
import { useWizardStore } from '@/store/wizardStore';
import { ordersService } from '@/services/orders';

interface Order {
    _id: string;
    zohoInvoiceId: string;
    orderId: string;
    customerDetails: {
        customer_name: string;
        email: string;
        phone: string;
        country_code: string;
        address: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    };
    invoiceItems: InvoiceItem[];
    salespersonName: Salesperson | '';
    paymentMode?: 'Prepaid' | 'COD';
    status: string;
    createdAt: string;
}

export default function PendingOrdersStep() {
    const updateForm = useWizardStore((s) => s.updateForm);
    const nextStep = useWizardStore((s) => s.nextStep);

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await ordersService.list();
            if (data.success) {
                setOrders(data.orders as unknown as Order[]);
            } else {
                throw new Error(data.error || 'Failed to fetch orders');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();
    }, []);

    const handleSelectOrder = (order: Order) => {
        const normalizedItems: InvoiceItem[] = (order.invoiceItems || []).map((raw) => {
            const item = raw as unknown as Record<string, unknown>;
            return {
                name: String(item.name ?? ''),
                description: item.description ? String(item.description) : '',
                quantity: Number(item.quantity ?? 1),
                price: Number(item.price ?? item.rate ?? 0),
                final_price: typeof item.final_price === 'number' ? item.final_price as number : undefined,
                discount: typeof item.discount === 'number' ? item.discount as number : undefined,
                tax_id: typeof item.tax_id === 'string' ? item.tax_id as string : 'NO_TAX',
                tax_amount: typeof item.tax_amount === 'number' ? item.tax_amount as number : undefined,
                item_total: typeof item.item_total === 'number' ? item.item_total as number : undefined,
                hsn_or_sac: typeof item.hsn_or_sac === 'string' ? item.hsn_or_sac as string : undefined,
                unit: typeof item.unit === 'string' ? item.unit as string : undefined,
                carat_size: typeof item.carat_size === 'number' ? item.carat_size as number : undefined,
                zoho_item_id: typeof item.zoho_item_id === 'string' ? item.zoho_item_id as string : undefined,
                cost_price: typeof item.cost_price === 'number' ? item.cost_price as number : 0,
            };
        });

        updateForm({
            invoiceId: order.zohoInvoiceId,
            orderId: order.orderId,
            customer_name: order.customerDetails.customer_name,
            email: order.customerDetails.email,
            phone: order.customerDetails.phone,
            country_code: order.customerDetails.country_code,
            address: order.customerDetails.address,
            city: order.customerDetails.city,
            state: order.customerDetails.state,
            country: order.customerDetails.country,
            pincode: order.customerDetails.pincode,
            invoice_items: normalizedItems,
            salesperson_name: order.salespersonName,
            payment_mode: order.paymentMode === 'COD' ? 'COD' : 'Prepaid',
            isPincodeServiceable: true,
        });
        nextStep();
    };

    if (loading) {
        return (
            <div className="form-section flex justify-center py-10">
                <div className="btn-spinner border-[3px] border-accent border-t-transparent rounded-full w-8 h-8"></div>
            </div>
        );
    }

    return (
        <div className="form-section animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <h3 className="section-title mb-0">
                    <span className="section-icon">📋</span> Pending Orders
                </h3>
                <button onClick={fetchOrders} className="text-sm text-accent hover:underline flex items-center gap-1">
                    ↻ Refresh
                </button>
            </div>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#16161f] rounded-xl border border-dashed border-gray-300 dark:border-[#2a2a38]">
                    <span className="text-4xl block mb-2">🎉</span>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="text-gray-500 dark:text-gray-400">No pending orders to schedule.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {orders.map(order => (
                        <div
                            key={order._id}
                            className="bg-white dark:bg-[#16161f] border border-gray-200 dark:border-[#2a2a38] rounded-xl p-5 hover:border-accent/50 transition-colors cursor-pointer group flex items-center justify-between"
                            onClick={() => handleSelectOrder(order)}
                        >
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">{order.orderId}</span>
                                    <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 px-2 py-0.5 rounded font-medium">PENDING</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium text-gray-900 dark:text-white ${order.paymentMode === 'COD' ? 'bg-red-100 dark:bg-red-500/20' : 'bg-green-100 dark:bg-green-500/20'}`}>
                                        {order.paymentMode === 'COD' ? 'COD' : 'Prepaid'}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-4">
                                    <span>👤 {order.customerDetails.customer_name}</span>
                                    {order.salespersonName && <span>🧑‍💼 {order.salespersonName}</span>}
                                    <span>📅 {new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {order.customerDetails.city}, {order.customerDetails.state} {order.customerDetails.pincode}
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="btn btn-secondary py-1.5 px-4 text-sm">Schedule ➔</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
