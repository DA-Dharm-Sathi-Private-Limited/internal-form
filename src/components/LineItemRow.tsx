'use client';

import type { WheelEvent } from 'react';
import type { InvoiceItem, ZohoItem, ZohoTax } from '@/types/invoice';
import { getCorrectTaxId } from '@/lib/tax';

interface HsnCategory {
    code: string;
    name: string;
    description: string;
}

const HSN_CATEGORIES: HsnCategory[] = [
    {
        code: '14049070',
        name: 'Rudrakshas',
        description: 'All Mukhi Rudrakshas, Rudraksha Malas, and other plant-based beads (like Tulsi Malas).',
    },
    {
        code: '05080010',
        name: 'Gemstones and Raw Crystals',
        description: 'Precious and semi-precious stones (Ruby, Sapphire, Coral, Pearls), Geodes, and raw crystal clusters.',
    },
    {
        code: '71179090',
        name: 'Bracelets, Malas and Decorative Items',
        description: 'Crystal bracelets (Amethyst, Pyrite, etc.), imitation jewelry, 7 Chakra items, and decorative crystal items (rollers, plates).',
    },
    {
        code: '83062990',
        name: 'Vastu Metal',
        description: 'Vastu items made of general base metals, iron, or mixed alloys (e.g., metal pyramids, basic statuettes).',
    },
    {
        code: '74198090',
        name: 'Vastu Copper/Brass',
        description: 'Premium Vastu items specifically made of copper or brass (e.g., Copper Yantras, Brass Tortoises).',
    },
    {
        code: '44209090',
        name: 'Vastu Wooden',
        description: 'Vastu items carved from wood (e.g., Wooden frames, Shriparni wood items).',
    },
    {
        code: '39269090',
        name: 'Miscellaneous Goods',
        description: "Catch-all for physical items that don't fit above (e.g., resin items, plastic/acrylic stands, mixed-material novelties).",
    },
    {
        code: '999591',
        name: 'Poojas and Services',
        description: 'Astrological consultations, Puja services, and other spiritual services (SAC code).',
    },
    {
        code: '999799',
        name: 'Miscellaneous Services',
        description: 'Catch-all for any other non-physical service charges not covered elsewhere (SAC code).',
    },
    {
        code: '996812',
        name: 'Shipping and Delivery Services',
        description: 'Delivery charges, shipping, and Cash on Delivery (COD) services.',
    },
];

interface LineItemRowProps {
    item: InvoiceItem;
    index: number;
    zohoItems?: ZohoItem[];
    zohoTaxes?: ZohoTax[];
    isInterstate?: boolean;
    onChange: (index: number, updates: Partial<InvoiceItem>) => void;
    onRemove: (index: number) => void;
    canRemove: boolean;
    readOnlyAllExceptCostPrice?: boolean;
}

export default function LineItemRow({
    item,
    index,
    zohoItems = [],
    zohoTaxes = [],
    isInterstate = true,
    onChange,
    onRemove,
    canRemove,
    readOnlyAllExceptCostPrice = false,
}: LineItemRowProps) {
    const safeZohoItems = Array.isArray(zohoItems) ? zohoItems : [];
    const safeZohoTaxes = Array.isArray(zohoTaxes) ? zohoTaxes : [];
    const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
        event.currentTarget.blur();
    };

    const qty = Number(item.quantity) || 1;
    const finalPriceUnit = typeof item.final_price === 'number' && item.final_price > 0 
        ? item.final_price 
        : (Number(item.price || (item as any).rate || 0) + (qty > 0 ? (item.tax_amount || 0) / qty : 0));
    const preTaxRate = Number(item.price) || (finalPriceUnit > 0 ? finalPriceUnit : 0);

    const selectedTaxRate = (() => {
        if (item.tax_id && item.tax_id !== 'NO_TAX') {
            const t = safeZohoTaxes.find(tx => tx.tax_id === item.tax_id);
            if (t) return t.tax_percentage;
        }
        if (item.hsn_or_sac === '71179090' || item.hsn_or_sac === '44209090') return 3;
        if (item.hsn_or_sac === '05080010') return 0.25;
        if (item.hsn_or_sac === '74198090' || item.hsn_or_sac === '83062990') return 12;
        if (item.hsn_or_sac === '999591') return 18;
        return 0;
    })();

    const taxAmount = (item.tax_amount && item.tax_amount > 0)
        ? item.tax_amount
        : (selectedTaxRate > 0 && finalPriceUnit > 0 
            ? Math.round((finalPriceUnit - (finalPriceUnit / (1 + selectedTaxRate / 100))) * qty * 100) / 100 
            : 0);

    const itemTotal = (item.item_total && item.item_total > 0) ? item.item_total : (finalPriceUnit * qty);

    return (
        <div className="line-item-row">
            <div className="line-item-number">{index + 1}</div>

            <div className="line-item-fields">
                <div className="line-item-field line-item-name">
                    <label>Item Name *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Product / service name"
                        list={`zoho-items-${index}`}
                        value={item.name}
                        disabled={readOnlyAllExceptCostPrice}
                        onChange={(e) => {
                            const val = e.target.value;
                            const updates: Partial<InvoiceItem> = { name: val };

                            // Check if val matches a Zoho item
                            const matched = safeZohoItems.find(z => z.name === val);
                            if (matched) {
                                // Auto-populate other fields
                                updates.zoho_item_id = matched.item_id;
                                if (matched.description) updates.description = matched.description;
                                if (matched.rate) updates.final_price = matched.rate;
                                if (matched.hsn_or_sac) {
                                    updates.hsn_or_sac = matched.hsn_or_sac;
                                    // Auto-apply correct tax from the HSN map
                                    updates.tax_id = getCorrectTaxId(matched.hsn_or_sac, isInterstate);
                                }
                            } else {
                                // Name edited away from a known item — clear catalog reference
                                updates.zoho_item_id = '';
                                // Auto-classify based on name keywords if HSN not set
                                const lowerName = val.toLowerCase();
                                let autoHsn = '';
                                if (/bracelet|crystal|mala|pyrite|amethyst|chakra|roller|plate/i.test(lowerName)) {
                                    autoHsn = '71179090'; // Bracelets & Decorative Items
                                } else if (/rudraksh|mukhi|tulsi|bead/i.test(lowerName)) {
                                    autoHsn = '14049070'; // Rudrakshas (0%)
                                } else if (/gemstone|ruby|sapphire|emerald|coral|pearl|geode|raw/i.test(lowerName)) {
                                    autoHsn = '05080010'; // Gemstones (0.25%)
                                } else if (/copper|brass|yantra|tortoise/i.test(lowerName)) {
                                    autoHsn = '74198090'; // Copper/Brass (18%)
                                } else if (/metal|pyramid|statuette/i.test(lowerName)) {
                                    autoHsn = '83062990'; // Metal (18%)
                                } else if (/wood|shriparni/i.test(lowerName)) {
                                    autoHsn = '44209090'; // Wooden (3%)
                                } else if (/pooja|puja|astrolog|consult/i.test(lowerName)) {
                                    autoHsn = '999591'; // Poojas & Services (0%)
                                }
                                if (autoHsn && !item.hsn_or_sac) {
                                    updates.hsn_or_sac = autoHsn;
                                    updates.tax_id = getCorrectTaxId(autoHsn, isInterstate);
                                }
                            }
                            onChange(index, updates);
                        }}
                        required
                    />
                    <datalist id={`zoho-items-${index}`}>
                        {safeZohoItems.map((z, i) => (
                            <option key={z.item_id || i} value={z.name} />
                        ))}
                    </datalist>
                    {/* Status badge */}
                    {item.name && (
                        item.zoho_item_id
                            ? <span className="line-item-badge line-item-badge--zoho">✓ In Zoho</span>
                            : <span className="line-item-badge line-item-badge--new">★ New product</span>
                    )}
                </div>

                <div className="line-item-field line-item-desc">
                    <label>Description</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Brief description"
                        value={item.description || ''}
                        disabled={readOnlyAllExceptCostPrice}
                        onChange={(e) => onChange(index, { description: e.target.value })}
                    />
                </div>

                <div className="line-item-field line-item-hsn">
                    <label>HSN/SAC Code & Category *</label>
                    <select
                        className="form-input"
                        value={item.hsn_or_sac || ''}
                        disabled={readOnlyAllExceptCostPrice}
                        title={
                            HSN_CATEGORIES.find(c => c.code === item.hsn_or_sac)?.description ?? 'Select HSN/SAC category'
                        }
                        onChange={(e) => {
                            const code = e.target.value;
                            const taxId = code ? getCorrectTaxId(code, isInterstate) : item.tax_id;
                            onChange(index, { 
                                hsn_or_sac: code,
                                ...(taxId ? { tax_id: taxId } : {})
                            });
                        }}
                    >
                        <option value="">— Select HSN/SAC Category —</option>
                        {HSN_CATEGORIES.map(cat => (
                            <option key={cat.code} value={cat.code} title={cat.description}>
                                {cat.name} ({cat.code})
                            </option>
                        ))}
                        {/* Show unknown codes (auto-filled from Zoho) as a labelled fallback */}
                        {item.hsn_or_sac && !HSN_CATEGORIES.find(c => c.code === item.hsn_or_sac) && (
                            <option value={item.hsn_or_sac}>{item.hsn_or_sac}</option>
                        )}
                    </select>
                </div>


                <div className="line-item-field line-item-carat">
                    <label>Carat Size</label>
                    <input
                        type="number"
                        className="form-input"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.carat_size ?? ''}
                        disabled={readOnlyAllExceptCostPrice}
                        onChange={(e) => {
                            const raw = e.target.value;
                            onChange(index, {
                                carat_size: raw === '' ? undefined : Math.round(Number(raw) * 100) / 100,
                            });
                        }}
                    />
                </div>

                <div className="line-item-field line-item-cost-price">
                    <label>Cost Price (₹) *</label>
                    <input
                        type="number"
                        className="form-input no-spinner"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.cost_price || ''}
                        inputMode="decimal"
                        onWheel={preventWheelValueChange}
                        onChange={(e) => {
                            const raw = e.target.value;
                            onChange(index, {
                                cost_price: raw === '' ? 0 : Number(raw),
                            });
                        }}
                        required
                    />
                </div>

                <div className="line-item-field line-item-qty">
                    <label className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">Qty *</label>
                    <input
                        type="number"
                        className="form-input no-spinner font-black text-center text-base text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-lg py-2 px-2 focus:ring-2 focus:ring-indigo-500 min-w-[70px]"
                        min="1"
                        step="1"
                        value={item.quantity || 1}
                        disabled={readOnlyAllExceptCostPrice}
                        onChange={(e) => {
                            const val = e.target.value;
                            onChange(index, { quantity: val === '' ? 1 : Math.max(1, Number(val)) });
                        }}
                        required
                    />
                </div>

                {/* Tax selector — required, shown before Final Price so user picks tax first */}
                <div className="line-item-field line-item-tax">
                    <label className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">Tax *</label>
                    <select
                        className="form-input font-black text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-purple-500 rounded-lg py-2 px-2 focus:ring-2 focus:ring-purple-500 cursor-pointer min-w-[135px]"
                        value={item.tax_id || ''}
                        disabled={readOnlyAllExceptCostPrice}
                        onChange={(e) => onChange(index, { tax_id: e.target.value })}
                        required
                    >
                        <option value="" disabled className="bg-slate-900 text-white">Select tax…</option>
                        <option value="NO_TAX" className="bg-slate-900 text-white font-medium">No Tax (0%)</option>
                        {safeZohoTaxes.map(t => (
                            <option key={t.tax_id} value={t.tax_id} className="bg-slate-900 text-white font-medium">{t.tax_name} ({t.tax_percentage}%)</option>
                        ))}
                    </select>
                    <div className="mt-1 text-[11px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-1 rounded border border-indigo-300 dark:border-indigo-800 flex items-center justify-between min-w-[135px]">
                        <span>GST ({selectedTaxRate}%):</span>
                        <span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                    {item.tax_auto_corrected && item.tax_correction_note && (
                        <div
                            className="mt-1 text-xs rounded-md px-2 py-1"
                            style={{
                                background: 'rgba(248, 113, 113, 0.08)',
                                border: '1px solid rgba(248, 113, 113, 0.35)',
                                color: '#fecaca',
                            }}
                        >
                            {item.tax_correction_note}
                        </div>
                    )}
                </div>

                {/* User enters the final (tax-inclusive) price per unit */}
                <div className="line-item-field line-item-price">
                    <label>Final Price (₹) *</label>
                    <input
                        type="number"
                        className="form-input no-spinner"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={finalPriceUnit > 0 ? finalPriceUnit : ''}
                        disabled={readOnlyAllExceptCostPrice}
                        inputMode="decimal"
                        onWheel={preventWheelValueChange}
                        onChange={(e) => {
                            const raw = e.target.value;
                            onChange(index, { final_price: raw === '' ? undefined : Number(raw) });
                        }}
                        required
                    />
                    {preTaxRate > 0 && taxAmount > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                            Rate: ₹{preTaxRate.toFixed(2)} + Tax: ₹{taxAmount.toFixed(2)}
                        </div>
                    )}
                </div>

                <div className="line-item-field line-item-total">
                    <label>Amount</label>
                    <div className="line-item-total-value">
                        ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {!!taxAmount && <div className="text-xs text-gray-500 font-normal mt-1">incl. ₹{taxAmount.toFixed(2)} tax</div>}
                    </div>
                </div>
            </div>

            {canRemove && !readOnlyAllExceptCostPrice && (
                <button
                    type="button"
                    className="line-item-remove"
                    onClick={() => onRemove(index)}
                    title="Remove item"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
