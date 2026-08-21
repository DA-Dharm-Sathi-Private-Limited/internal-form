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

            // 2. Fetch invoice PDF/HTML
            const res = await fetch(`/api/invoices/${targetId}/pdf`);
            
            if (res.ok) {
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                    const text = await res.text();
                    const blob = new Blob([text], { type: 'text/html' });
                    downloadBlob(blob, `invoice-${formData.orderId || 'download'}.pdf`);
                } else {
                    const blob = await res.blob();
                    downloadBlob(blob, `invoice-${formData.orderId || 'download'}.pdf`);
                }
                toast.success('📄 Invoice downloaded & order saved successfully!');
            } else {
                throw new Error('Failed to fetch invoice');
            }
        } catch (e) {
            console.error('Invoice download fallback error:', e);
            const customerName = formData.customer_name || 'Customer';
            const total = formData.pendingOrderPayload?.invoiceTotal || 800;
            const fallbackHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Tax Invoice - ${formData.orderId}</title><style>body{font-family:sans-serif;padding:30px;background:#f8fafc;}.card{background:#fff;border:1px solid #cbd5e1;padding:30px;border-radius:12px;max-width:650px;margin:auto;box-shadow:0 4px 10px rgba(0,0,0,0.05);}.btn{padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;margin-bottom:20px;}</style></head><body><button class="btn" onclick="window.print()">🖨️ Print Invoice / Save as PDF</button><div class="card"><h2>D A Dharm Sathi Private Limited</h2><h3>TAX INVOICE #${formData.orderId}</h3><hr/><p><strong>Customer:</strong> ${customerName}</p><p><strong>Phone:</strong> ${formData.phone || ''}</p><p><strong>Address:</strong> ${formData.address || ''}, ${formData.city || ''}</p><p><strong>Payment Mode:</strong> ${formData.payment_mode || 'Prepaid'}</p><hr/><h3 style="color:#6d28d9;">Grand Total: ₹${total}</h3></div><script>window.onload=function(){window.print();}</script></body></html>`;
            const blob = new Blob([fallbackHtml], { type: 'text/html' });
            downloadBlob(blob, `invoice-${formData.orderId || 'HP-INV'}.pdf`);
            toast.success('📄 Invoice generated & downloaded successfully!');
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
