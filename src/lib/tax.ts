import { InvoiceItem, ZohoTax } from '@/types/invoice';

// ============================================================
// GST Tax Selection — Simple HSN + Inter/Intra Map
// ============================================================

const BUSINESS_STATE_NAME = 'Haryana';
const BUSINESS_STATE_CODES = ['HR', '06', 'HARYANA'];

const normalizeState = (value: string | undefined | null): string => {
  return (value || '').trim().toUpperCase();
};

const isSameStateAsBusiness = (value: string | undefined | null): boolean => {
  const norm = normalizeState(value);
  if (!norm) return false;
  if (BUSINESS_STATE_CODES.includes(norm)) return true;
  return norm === BUSINESS_STATE_NAME.toUpperCase();
};

export const isInterstateOrder = (customerStateOrCode: string | undefined | null): boolean => {
  if (!customerStateOrCode) return true;
  return !isSameStateAsBusiness(customerStateOrCode);
};

// Smart Tax Categorization helper for products (Rudraksha, Gemstones, Bracelets, Vastu)
export function getItemTaxRateAndHsn(name: string = '', hsn: string = '', taxPct?: number) {
  const cleanName = name.toLowerCase();

  // 1. Rudraksha / Rudraksh Malas / Tulsi / Puja items -> 0% Tax (EXEMPT under GST)
  if (/rudraksh|rudraksha|tulsi|pooja|puja|14049070|999591/i.test(cleanName) || hsn === '14049070' || hsn === '999591') {
    return { taxRate: 0, hsn: hsn || '14049070', label: '0%' };
  }

  // 2. Precious / Semi-Precious Gemstones -> 0.25% Tax
  if (/ruby|sapphire|emerald|panna|manik|neelam|pukhraj|hessonite|gomed|cat'?s\s*eye|pearl|moti|diamond|opal|05080010/i.test(cleanName) || hsn === '05080010') {
    return { taxRate: 0.25, hsn: hsn || '05080010', label: '0.25%' };
  }

  // 3. Vastu Metal / Copper / Brass / Yantras -> 18% Tax
  if (/metal|copper|brass|frame|yantra|83062990|74198090/i.test(cleanName) || hsn === '83062990' || hsn === '74198090') {
    return { taxRate: 18, hsn: hsn || '83062990', label: '18%' };
  }

  // 4. Custom Tax Rate if specified explicitly
  if (taxPct !== undefined && taxPct !== null && taxPct >= 0) {
    return { taxRate: taxPct, hsn: hsn || '71179090', label: `${taxPct}%` };
  }

  // 5. Default Bracelets / Decorative Items -> 3% Tax
  return { taxRate: 3, hsn: hsn || '71179090', label: '3%' };
}

interface HsnTaxIds {
  inter: string;
  intra: string;
}

const HSN_TAX_IDS: Record<string, HsnTaxIds> = {
  // 0% — Rudrakshas & Sacred Items (Exempt)
  '14049070': { inter: 'NO_TAX', intra: 'NO_TAX' },
  // 0.25% — Gemstones and Raw Crystals
  '05080010': { inter: '3355221000000032572', intra: '3355221000000044472' },
  // 3% — Bracelets, Malas and Decorative Items
  '71179090': { inter: '3355221000000032756', intra: '3355221000000044134' },
  // 18% — Vastu Metal
  '83062990': { inter: '3355221000000032375', intra: '3355221000000032451' },
  // 18% — Vastu Copper/Brass
  '74198090': { inter: '3355221000000032375', intra: '3355221000000032451' },
  // 3% — Vastu Wooden
  '44209090': { inter: '3355221000000032756', intra: '3355221000000044134' },
  // 3% — Miscellaneous Goods
  '39269090': { inter: '3355221000000032756', intra: '3355221000000044134' },
  // 0% — Poojas and Services
  '999591': { inter: 'NO_TAX', intra: 'NO_TAX' },
  '999799': { inter: 'NO_TAX', intra: 'NO_TAX' },
  // 18% — Delivery and COD Charges
  '996812': { inter: '3355221000000032375', intra: '3355221000000032451' },
};

export const HSN_TAX_RATES: Record<string, number> = {
  '14049070': 0,      // 0% — Rudrakshas & Sacred Seeds
  '05080010': 0.25,   // 0.25% — Gemstones
  '71179090': 3,      // 3% — Bracelets & Jewelry
  '83062990': 18,     // 18% — Vastu Metal
  '74198090': 18,     // 18% — Vastu Copper
  '44209090': 3,      // 3% — Vastu Wooden
  '39269090': 3,      // 3% — Misc
  '999591': 0,        // 0% — Poojas
  '999799': 0,        // 0% — Services
  '996812': 18,       // 18% — Delivery
};

const TAX_18_INTER = '3355221000000032375';
const TAX_18_INTRA = '3355221000000032451';

export const getCorrectTaxId = (hsn: string, isInterstate: boolean): string => {
  const entry = HSN_TAX_IDS[hsn];
  if (!entry) return 'NO_TAX';
  return isInterstate ? entry.inter : entry.intra;
};

export const get18PctTaxId = (isInterstate: boolean): string => {
  return isInterstate ? TAX_18_INTER : TAX_18_INTRA;
};

interface NormalizeContext {
  item: InvoiceItem;
  updates: Partial<InvoiceItem>;
  taxes: ZohoTax[];
  isInterstate: boolean;
}

export const normalizeItemTaxForContext = ({
  item,
  updates,
  isInterstate,
}: NormalizeContext): Partial<InvoiceItem> => {
  if (item.zoho_item_id === '__system__') {
    return updates;
  }

  const merged: InvoiceItem = { ...item, ...updates };
  const hsn = merged.hsn_or_sac || '';

  if (!HSN_TAX_IDS[hsn]) {
    return updates;
  }

  const correctTaxId = getCorrectTaxId(hsn, isInterstate);

  if (merged.tax_id === correctTaxId) {
    return {
      ...updates,
      tax_auto_corrected: false,
      tax_correction_note: undefined,
    };
  }

  let note: string | undefined;
  if (merged.tax_id && merged.tax_id !== 'NO_TAX' && merged.tax_id !== correctTaxId) {
    note = !isInterstate
      ? 'Switched to CGST+SGST (intrastate transaction).'
      : 'Switched to IGST (interstate transaction).';
  }

  return {
    ...updates,
    tax_id: correctTaxId,
    tax_auto_corrected: !!note,
    tax_correction_note: note,
  };
};

export interface TaxValidationIssue {
  index: number;
  message: string;
}

export const validateTaxesForOrder = (
  items: InvoiceItem[],
  _taxes: ZohoTax[],
  isInterstate: boolean
): TaxValidationIssue[] => {
  const issues: TaxValidationIssue[] = [];

  items.forEach((item, index) => {
    const hsn = item.hsn_or_sac || '';
    if (!HSN_TAX_IDS[hsn]) return;

    const correctTaxId = getCorrectTaxId(hsn, isInterstate);
    if (item.tax_id !== correctTaxId) {
      issues.push({
        index,
        message: !isInterstate
          ? 'IGST cannot be applied as this is an intrastate transaction. Tax must be CGST+SGST.'
          : 'CGST/SGST cannot be applied for interstate. Tax must be IGST.',
      });
    }
  });

  return issues;
};
