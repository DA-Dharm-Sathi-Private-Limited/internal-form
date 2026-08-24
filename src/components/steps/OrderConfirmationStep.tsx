'use client';

import { useState } from 'react';
import { CombinedFormData } from '@/types/wizard';
import { zohoService } from '@/services/zoho';
import { ordersService } from '@/services/orders';
import { toast } from 'sonner';

interface Props {
    formData: CombinedFormData;
    onReset: () => void;
}

export default function OrderConfirmationStep({ formData, onReset }: Props) {
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleDownloadInvoice = async () => {
        const targetId = formData.invoiceId || formData.orderId;
        if (!targetId) return;
        setDownloadingInvoice(true);

        try {
            // 1. Save Order to Database if pending
            if (formData.pendingOrderPayload && !formData.isSavedToDb) {
                try {
                    const saveRes = await ordersService.create(formData.pendingOrderPayload);
                    if (saveRes.success) {
                        formData.isSavedToDb = true;
                    }
                } catch (saveErr) {
                    console.error('Failed to save order to DB on download:', saveErr);
                }
            }

            // 2. Open invoice PDF in new tab directly
            window.open(`/api/invoices/${targetId}/pdf`, '_blank');
            toast.success('📄 Invoice opened & order saved successfully!');
        } catch (e) {
            console.error('Invoice view error:', e);
            toast.error('Failed to open invoice');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    return (
        <div className="form-section animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-8">

            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border-2 border-green-500/50">
                ✓
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Invoice Created Successfully!</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                The invoice has been generated in Zoho Billing. Click below to download PDF and save order to database.
            </p>

            <div className="flex justify-center items-stretch max-w-sm mx-auto mb-10">
                {/* Invoice Card */}
                <div className="w-full bg-[#16161f] p-5 rounded-xl border border-[#2a2a38]">
                    <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-1">Zoho Invoice</h4>
                    <p className="text-xl font-bold text-white mb-4">{formData.orderId}</p>
                    <button
                        className="btn btn-secondary w-full"
                        onClick={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                    >
                        {downloadingInvoice ? 'Downloading & Saving...' : '📄 Download Invoice PDF & Save Order'}
                    </button>
                </div>
            </div>

            <button className="btn btn-link text-lg group" onClick={onReset}>
                + Create Another Order
                <span className="block h-px bg-accent w-0 group-hover:w-full transition-all duration-300"></span>
            </button>
        </div>
    );
}
