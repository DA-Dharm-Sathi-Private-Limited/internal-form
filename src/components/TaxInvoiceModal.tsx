'use client';

import React, { useRef } from 'react';
import { toast } from 'sonner';

interface TaxInvoiceModalProps {
  order: {
    customer_name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    payment_mode: 'Prepaid' | 'COD';
    astrologer_name?: string;
    astrologer_phone?: string;
    items: {
      name: string;
      quantity: number;
      final_price: number;
      hsn_or_sac: string;
      category_name: string;
      tax_rate: number;
      tax_id: string;
      pre_tax_price: number;
      tax_amount: number;
      item_total: number;
    }[];
    subtotal: number;
    tax_total: number;
    shipping_charge: number;
    cod_charge: number;
    grand_total: number;
  };
  onClose: () => void;
  onDownloadPDF?: () => void;
}

export default function TaxInvoiceModal({ order, onClose, onDownloadPDF }: TaxInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const invoiceNo = `HP-INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: any): string => {
      if ((n = n.toString()).length > 9) return 'overflow';
      const nStr: any = ('000000000' + n).substr(-9);
      const matched = nStr.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!matched) return '';
      let str = '';
      str += (matched[1] != 0) ? (a[Number(matched[1])] || b[matched[1][0]] + ' ' + a[matched[1][1]]) + 'Crore ' : '';
      str += (matched[2] != 0) ? (a[Number(matched[2])] || b[matched[2][0]] + ' ' + a[matched[2][1]]) + 'Lakh ' : '';
      str += (matched[3] != 0) ? (a[Number(matched[3])] || b[matched[3][0]] + ' ' + a[matched[3][1]]) + 'Thousand ' : '';
      str += (matched[4] != 0) ? (a[Number(matched[4])] || b[matched[4][0]] + ' ' + a[matched[4][1]]) + 'Hundred ' : '';
      str += (matched[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(matched[5])] || b[matched[5][0]] + ' ' + a[matched[5][1]]) : '';
      return str;
    };

    const rounded = Math.round(num);
    const words = inWords(rounded);
    return `Indian Rupee ${words ? words : 'Zero'} Only`;
  };

  const handleDownloadPDF = async () => {
    if (onDownloadPDF) {
      try {
        await onDownloadPDF();
      } catch (err) {
        console.error('onDownloadPDF callback error:', err);
      }
    }

    if (!printRef.current) return;
    toast.info('Generating & Downloading Tax Invoice PDF...');

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = printRef.current;
      const opt: any = {
        margin: 5,
        filename: `tax-invoice-${invoiceNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('🎉 Tax Invoice PDF downloaded successfully!');
    } catch (e) {
      console.error('html2pdf failed, falling back to window.print():', e);
      toast.info('Opening print dialog to Save as PDF...');
      window.print();
    }
  };

  const handlePrint = () => {
    if (onDownloadPDF) {
      onDownloadPDF();
    }
    window.print();
  };

  // Group line items and calculate taxes dynamically
  const preTaxSubtotal = order.items.reduce((acc, it) => acc + (it.pre_tax_price * it.quantity), 0) + (order.shipping_charge > 0 ? 84.75 : 0);
  
  const taxBreakdownMap: Record<number, number> = {};
  order.items.forEach(it => {
    if (it.tax_rate > 0) {
      taxBreakdownMap[it.tax_rate] = (taxBreakdownMap[it.tax_rate] || 0) + (it.tax_amount * it.quantity);
    }
  });
  if (order.shipping_charge > 0) {
    taxBreakdownMap[18] = (taxBreakdownMap[18] || 0) + 15.25;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Actions */}
        <div className="p-4 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>📄 Official Tax Invoice Preview</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
            >
              📥 Download PDF & Save Order
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              🖨️ Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-100">
          <div ref={printRef} className="p-6 bg-white text-gray-900 border border-gray-300 font-sans text-xs space-y-4 shadow-sm rounded-lg">
            
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div className="flex items-center gap-4">
                {/* Standard HTML img for html2canvas compatibility */}
                <img
                  src="/hp_logo.png"
                  alt="HUMARA PANDIT"
                  style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
                />
                <div>
                  <h1 className="font-extrabold text-base tracking-tight text-gray-900">D A Dharm Sathi Private Limited</h1>
                  <p className="text-[11px] text-gray-600">Haryana, India</p>
                  <p className="text-[11px] text-gray-600">GSTIN: 06AALCD7494B1ZI</p>
                  <p className="text-[11px] text-gray-600">namaste@humarapandit.com</p>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-2xl font-black tracking-wider text-gray-900 uppercase">TAX INVOICE</h2>
              </div>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 border border-gray-300 text-[11px]">
              <div className="p-2 border-r border-gray-300 space-y-1">
                <p><span className="font-bold text-gray-700"># :</span> <strong className="text-gray-900">{invoiceNo}</strong></p>
                <p><span className="font-bold text-gray-700">Invoice Date :</span> {dateStr}</p>
                <p><span className="font-bold text-gray-700">Terms :</span> Due on Receipt</p>
              </div>
              <div className="p-2 space-y-1">
                <p><span className="font-bold text-gray-700">Place Of Supply :</span> {order.state || 'Punjab'}</p>
                <p><span className="font-bold text-gray-700">Phone Number :</span> +91{order.phone}</p>
              </div>
            </div>

            {/* Customer & Partner Box */}
            <div className="border border-gray-300 p-3 bg-gray-50 text-[11px] flex justify-between items-start rounded">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Bill To / Ship To</span>
                <p className="font-extrabold text-sm text-gray-900">{order.customer_name}</p>
                <p className="text-gray-700">{order.address}, {order.city}, {order.state} - {order.pincode}</p>
              </div>
              {order.astrologer_name && (
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Partner Astrologer</span>
                  <p className="font-bold text-gray-900">{order.astrologer_name}</p>
                  {order.astrologer_phone && <p className="text-[10px] text-gray-600">📱 {order.astrologer_phone}</p>}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse border border-gray-300 text-[11px]">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-gray-800 font-bold">
                  <th className="p-2 border-r border-gray-300 text-center w-8">#</th>
                  <th className="p-2 border-r border-gray-300 text-left">Description</th>
                  <th className="p-2 border-r border-gray-300 text-center">HSN/SAC</th>
                  <th className="p-2 border-r border-gray-300 text-center">Qty</th>
                  <th className="p-2 border-r border-gray-300 text-right">Rate</th>
                  <th className="p-2 border-r border-gray-300 text-center" colSpan={2}>IGST (%) & Amt</th>
                  <th className="p-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {order.items.map((it, idx) => {
                  const lineTotal = (it.final_price * it.quantity).toFixed(2);
                  return (
                    <tr key={idx}>
                      <td className="p-2 border-r border-gray-300 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-gray-300 font-medium text-gray-900">{it.name}</td>
                      <td className="p-2 border-r border-gray-300 text-center font-mono">{it.hsn_or_sac}</td>
                      <td className="p-2 border-r border-gray-300 text-center">{it.quantity}.00</td>
                      <td className="p-2 border-r border-gray-300 text-right">{it.pre_tax_price.toFixed(2)}</td>
                      <td className="p-2 border-r border-gray-300 text-center">{it.tax_rate}%</td>
                      <td className="p-2 border-r border-gray-300 text-right">{(it.tax_amount * it.quantity).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">{lineTotal}</td>
                    </tr>
                  );
                })}

                {/* Delivery Charges Line Item */}
                {order.shipping_charge > 0 && (
                  <tr>
                    <td className="p-2 border-r border-gray-300 text-center">{order.items.length + 1}</td>
                    <td className="p-2 border-r border-gray-300 font-medium text-gray-900">Delivery Charges</td>
                    <td className="p-2 border-r border-gray-300 text-center font-mono">996812</td>
                    <td className="p-2 border-r border-gray-300 text-center">1.00</td>
                    <td className="p-2 border-r border-gray-300 text-right">84.75</td>
                    <td className="p-2 border-r border-gray-300 text-center">18%</td>
                    <td className="p-2 border-r border-gray-300 text-right">15.25</td>
                    <td className="p-2 text-right font-bold">100.00</td>
                  </tr>
                )}

                {/* COD Charges Line Item */}
                {order.cod_charge > 0 && (
                  <tr>
                    <td className="p-2 border-r border-gray-300 text-center">{order.items.length + (order.shipping_charge > 0 ? 2 : 1)}</td>
                    <td className="p-2 border-r border-gray-300 font-medium text-gray-900">COD Fee</td>
                    <td className="p-2 border-r border-gray-300 text-center font-mono">996812</td>
                    <td className="p-2 border-r border-gray-300 text-center">1.00</td>
                    <td className="p-2 border-r border-gray-300 text-right">42.37</td>
                    <td className="p-2 border-r border-gray-300 text-center">18%</td>
                    <td className="p-2 border-r border-gray-300 text-right">7.63</td>
                    <td className="p-2 text-right font-bold">50.00</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Total Summary Table */}
            <div className="flex justify-between items-start pt-2">
              <div className="space-y-2 max-w-sm">
                <p className="text-[11px] font-bold text-gray-800">Total In Words</p>
                <p className="text-xs font-black text-gray-900 bg-gray-100 p-2 rounded border border-gray-300">
                  {numberToWords(order.grand_total)}
                </p>
                <div className="pt-2">
                  <p className="font-bold text-[10px] text-gray-600">Declaration & Terms:</p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                  </p>
                </div>
              </div>

              <div className="w-64 space-y-1 text-[11px]">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-600">Sub Total (Pre-tax):</span>
                  <span className="font-mono">₹{preTaxSubtotal.toFixed(2)}</span>
                </div>
                {Object.entries(taxBreakdownMap).map(([rate, amt]) => (
                  <div key={rate} className="flex justify-between py-0.5 text-gray-600">
                    <span>IGST ({rate}%):</span>
                    <span className="font-mono">₹{amt.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-gray-900 text-sm font-black text-gray-900">
                  <span>Total (₹):</span>
                  <span className="font-mono text-purple-700">₹{order.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Authorized Signatory */}
            <div className="pt-8 flex justify-end">
              <div className="text-center space-y-8">
                <p className="font-bold text-[11px]">For D A Dharm Sathi Private Limited</p>
                <p className="text-[10px] text-gray-500 border-t border-gray-400 pt-1 px-4">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
