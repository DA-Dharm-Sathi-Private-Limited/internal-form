import { NextRequest, NextResponse } from 'next/server';
import { isInterstateOrder, getCorrectTaxId, HSN_TAX_RATES } from '@/lib/tax';
import { ProductCPMaster } from '@/lib/product-cp';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Text prompt is required' }, { status: 400 });
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Phone Number Extraction
    let phone = '';
    const phoneMatch = text.match(/(?:Phone|Mobile|Contact|Tel|No\.|WhatsApp)[:\s]*([+\d\s-]{10,15})/i) || text.match(/(?:\+91[\s-]?)?([6-9]\d{9})/);
    if (phoneMatch) {
      phone = phoneMatch[1].replace(/[^\d]/g, '').slice(-10);
    }
    if (!phone) phone = '9983631551';

    // 2. Pincode Extraction
    let pincode = '';
    const pinMatch = text.match(/(?:Pincode|Pin|Zip|Postal)[:\s-]*([1-9]\d{2}\s*\d{3})/i) || text.match(/\b([1-9]\d{5})\b/);
    if (pinMatch) {
      pincode = pinMatch[1].replace(/\s+/g, '');
    }
    if (!pincode) pincode = '313001';

    // 3. Indian State Extraction
    const indianStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
      'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
      'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Delhi', 'Chandigarh', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
    ];

    let state = 'Rajasthan';
    for (const s of indianStates) {
      if (new RegExp(`\\b${s.replace(/&/g, '(?:&|and)')}\\b`, 'i').test(text)) {
        state = s;
        break;
      }
    }

    // 4. Customer Name Extraction
    let customer_name = '';
    const nameExplicit = text.match(/(?:Customer|Client|Name|Recipient|Ship To|Bill To|To)[:\s]*([^\n,]+)/i);
    if (nameExplicit) {
      customer_name = nameExplicit[1].replace(/^(?:Details|Info|Address)[:\s]*/i, '').trim();
    }

    if (!customer_name) {
      const addrIdx = lines.findIndex(l => /shipping address|address|ship to|recipient|client/i.test(l));
      if (addrIdx !== -1 && lines[addrIdx + 1] && !/house|flat|street|road|pincode|\d{6}/i.test(lines[addrIdx + 1])) {
        customer_name = lines[addrIdx + 1];
      }
    }

    if (!customer_name) {
      for (const line of lines) {
        if (/^(?:Mr\.|Mrs\.|Ms\.|Dr\.|Pt\.|Pandit|Astrologer|Shri|Smt\.)\s+[A-Z]/i.test(line)) {
          customer_name = line;
          break;
        }
      }
    }

    if (!customer_name) {
      if (lines[0] && lines[0].length < 35 && !/Address|Pincode|No\.|Phone|Product|CP:|Sales|From|To|Vendor|Discount/i.test(lines[0])) {
        customer_name = lines[0].replace(/CLIENT DETAILS|CUSTOMER DETAILS/i, '').trim();
      }
    }

    if (!customer_name) customer_name = 'Direct Client';

    // 5. Astrologer Partner Extraction (FROM Field)
    let astrologer_name = '';
    let astrologer_phone = '';
    const astroMatch = text.match(/(?:From|Astrologer|Partner|Seller|Agent)[:\s]*([^\n,]+)/i);
    if (astroMatch) {
      astrologer_name = astroMatch[1].trim();
      const aPhoneMatch = text.match(/(?:Astrologer Phone|From Phone|Partner Phone)[:\s]*([+\d\s-]{10,15})/i);
      if (aPhoneMatch) astrologer_phone = aPhoneMatch[1].replace(/[^\d]/g, '').slice(-10);
    }

    // 6. Vendor Supplier Extraction
    let vendor = 'Prayosha';
    const vendorExplicit = text.match(/(?:Vendor|Supplier|Source)[:\s]*([^\n,]+)/i);
    if (vendorExplicit) {
      vendor = vendorExplicit[1].trim();
    } else {
      if (/krunal/i.test(text)) vendor = 'Krunal';
      else if (/surya/i.test(text)) vendor = 'SURYA';
      else if (/rudra\s*ratan/i.test(text)) vendor = 'Rudra Ratan';
      else if (/prayosha/i.test(text)) vendor = 'Prayosha';
    }

    // 7. Discount Extraction
    let discountPercent = 0;
    let discountAmount = 0;
    const discountMatch = text.match(/(?:Discount|Off|Rebate)[:\s]*[₹Rs\.]*\s*(\d+)(%?)/i);
    if (discountMatch) {
      const val = Number(discountMatch[1]);
      if (discountMatch[2] === '%' || val <= 50) {
        discountPercent = val;
      } else {
        discountAmount = val;
      }
    }

    // 8. Address & City Extraction
    let address = '';
    const addressMatch = text.match(/(?:Address|Addr|Shipping Address|Ship To)[:\s-]*([^\n]+(?:\n[^\n]+)?)/i);
    if (addressMatch) {
      address = addressMatch[1]
        .replace(/Pincode[\s\S]*/i, '')
        .replace(/Items:[\s\S]*/i, '')
        .replace(/Products:[\s\S]*/i, '')
        .replace(/[-–—]\s*(?:one|two|three|\d+).*/i, '')
        .trim();
    }

    if (!address) {
      const addrLines = lines.filter(l => 
        /house|flat|bazar|bajaj|street|road|sector|colony|near|mandir|society|nagar|enclave|lane|marg|vihar|phase|block|plot|shop|building/i.test(l) &&
        !/rupees|rs\.?|₹|sales price|cost price|cp:|itemized|product|items|vendor|discount/i.test(l)
      );
      address = addrLines.join(', ') || 'Direct Address';
    }

    let city = 'Meerut';
    const cityMatch = text.match(/\b(Meerut|Zirakpur|Delhi|Noida|Gurgaon|Jaipur|Udaipur|Lucknow|Kanpur|Agra|Varanasi|Chandigarh|Ludhiana|Amritsar|Mumbai|Pune|Bangalore|Hyderabad|Chennai|Kolkata|Ahmedabad|Surat|Indore|Bhopal)\b/i);
    if (cityMatch) {
      city = cityMatch[1];
    }

    // 9. Payment Mode Extraction
    const isCod = /cod|cash on delivery|pay on delivery|pod/i.test(text);
    const payment_mode: 'Prepaid' | 'COD' = isCod ? 'COD' : 'Prepaid';

    // 10. Universal Product Tax Classifier Function
    const classifyProduct = (prodName: string) => {
      const pLower = prodName.toLowerCase();
      let hsn = '71179090';
      let catName = 'Bracelets & Decorative Items (3% GST)';

      if (/rudraksh|rudraksha|mukhi|tulsi|japa|mala|kantha|subha|sacred\s*bead/i.test(pLower)) {
        hsn = '14049070';
        catName = 'Rudrakshas & Sacred Malas (0% GST)';
      } else if (/moti|pearl|ruby|manik|sapphire|neelam|panna|emerald|pukhraj|coral|moonga|gemstone|crystal|sphatik|amethyst|quartz|opal|garnet|topaz|zircon/i.test(pLower)) {
        hsn = '05080010';
        catName = 'Gemstones & Crystals (0.25% GST)';
      } else if (/vastu|yantra|pyramid|kuber|shree|brass|copper|idol|statue|feng shui|metal/i.test(pLower)) {
        hsn = '74198090';
        catName = 'Vastu & Metal Artifacts (12% GST)';
      } else if (/pooja|puja|ritual|consultation|reading|astrology|services/i.test(pLower)) {
        hsn = '999591';
        catName = 'Astrological Services & Poojas (18% GST)';
      }

      return { hsn, catName };
    };

    const cleanName = (raw: string): string => {
      return raw
        .replace(/^(?:Items|Products|Product|Details|Line Items|Order)[:\s-]*/gi, '')
        .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen)\b/gi, '')
        .replace(/\b\d+\s*(?:pcs|pc|qty|x|nos|items|pieces|piece)\b/gi, '')
        .replace(/(?:rupees|rs\.?|₹|inr|total|\/-|each|per\s*piece|@|for|price|cost)?\s*\d+/gi, '')
        .replace(/\d+/g, '')
        .replace(/^[-\s–—:•\*]+/, '')
        .replace(/[-\s–—:•\*]+$/, '')
        .trim();
    };

    const items: any[] = [];
    const isInterstate = isInterstateOrder(state);

    const wordQtyMap: Record<string, number> = {
      one: 1, a: 1, single: 1, two: 2, double: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12
    };

    // Strategy 1: Multi-line Structured CP / Sales Price format
    const structuredProductRegex = /(?:\d+[\.\)]\s*)?([^\n\r]+?)(?:[\r\n\s]+CP[:\s]*[₹Rs\.]*([\d\.]+))?[\r\n\s]+Sales\s*Price[:\s]*[₹Rs\.]*([\d\.]+)/gi;
    let sMatch;

    while ((sMatch = structuredProductRegex.exec(text)) !== null) {
      let rawProdName = sMatch[1].replace(/^\d+[\.\)]\s*/, '').trim();
      const explicitCp = sMatch[2] ? Number(sMatch[2]) : 0;
      let salesPrice = Number(sMatch[3]);

      if (rawProdName && salesPrice > 0) {
        const prodName = cleanName(rawProdName);
        if (!prodName || prodName.length < 2) continue;

        // Apply Discount
        if (discountPercent > 0) {
          salesPrice = Math.round(salesPrice * (1 - discountPercent / 100));
        } else if (discountAmount > 0) {
          salesPrice = Math.max(10, salesPrice - discountAmount);
        }

        const { hsn, catName } = classifyProduct(prodName);
        const taxRate = HSN_TAX_RATES[hsn] || (hsn === '14049070' ? 0 : 3);
        const taxId = taxRate === 0 ? 'NO_TAX' : getCorrectTaxId(hsn, isInterstate);

        const preTaxUnit = taxRate > 0 ? Math.round((salesPrice / (1 + taxRate / 100)) * 100) / 100 : salesPrice;
        const taxAmount = taxRate > 0 ? Math.round((salesPrice - preTaxUnit) * 100) / 100 : 0;

        const finalCp = explicitCp || ProductCPMaster.getCostPrice(prodName, salesPrice, vendor);

        items.push({
          name: prodName.charAt(0).toUpperCase() + prodName.slice(1),
          quantity: 1,
          final_price: salesPrice,
          hsn_or_sac: hsn,
          category_name: catName,
          tax_rate: taxRate,
          tax_id: taxId,
          pre_tax_price: preTaxUnit,
          tax_amount: taxAmount,
          item_total: preTaxUnit,
          cost_price: finalCp
        });
      }
    }

    // Strategy 2: Universal Natural Language Item Parser
    if (items.length === 0) {
      const segments = text.split(/[-–—,\n\r]|(?:\band\b)/i);

      for (const rawSeg of segments) {
        const s = rawSeg.trim();
        if (!s) continue;

        if (/^(address|pincode|phone|no\.|mobile|customer|client|astrologer|shipping|ship to|bill to|payment|from|vendor|discount)/i.test(s)) continue;
        if (/house\s*no|flat\s*no|bazar|street|road|sector|colony|near|vihar|nagar/i.test(s) && !/rupees|rs\.?|₹|total|price|cost|bracelet|rudraksh|gemstone|moti|yantra|crystal|mala|tree|ring|pendant|locket|pyramid|idol|pooja/i.test(s)) continue;

        let explicitCp = 0;
        const cpMatch = s.match(/(?:CP|Cost Price|Cost)[:\s]*[₹Rs\.]*(\d+)/i);
        if (cpMatch) {
          explicitCp = Number(cpMatch[1]);
        }

        const priceMatch = s.match(/(?:rupees|rs\.?|₹|inr|for|@|price|cost)?\s*(\d{2,6})\s*(?:total|rupees|rs\.?|₹|inr|\/-|each|per\s*piece)?/i);

        if (priceMatch) {
          let rawPrice = Number(priceMatch[1]);
          if (rawPrice > 0 && rawPrice !== Number(pincode) && rawPrice < 500000) {
            let qty = 1;
            const wordQtyMatch = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen)\b/i);
            const numQtyMatch = s.match(/\b(\d+)\s*(?:pcs|pc|qty|x|nos|items)\b/i);

            if (wordQtyMatch) {
              qty = wordQtyMap[wordQtyMatch[1].toLowerCase()] || 1;
            } else if (numQtyMatch) {
              qty = Number(numQtyMatch[1]);
            }

            // Apply Discount
            if (discountPercent > 0) {
              rawPrice = Math.round(rawPrice * (1 - discountPercent / 100));
            } else if (discountAmount > 0) {
              rawPrice = Math.max(10, rawPrice - discountAmount);
            }

            const prodName = cleanName(s.replace(/(?:CP|Cost Price|Cost)[:\s]*[₹Rs\.]*\d+/gi, ''));

            if (prodName.length > 2 && !/^(address|pincode|phone|customer|name|client|house|flat|street|road|items|products|vendor|discount)/i.test(prodName)) {
              const { hsn, catName } = classifyProduct(prodName);
              const taxRate = HSN_TAX_RATES[hsn] || (hsn === '14049070' ? 0 : 3);
              const taxId = taxRate === 0 ? 'NO_TAX' : getCorrectTaxId(hsn, isInterstate);

              const preTaxUnit = taxRate > 0 ? Math.round((rawPrice / (1 + taxRate / 100)) * 100) / 100 : rawPrice;
              const preTaxTotal = preTaxUnit * qty;
              const taxAmount = taxRate > 0 ? Math.round((rawPrice - preTaxUnit) * qty * 100) / 100 : 0;

              const finalCp = explicitCp || ProductCPMaster.getCostPrice(prodName, rawPrice, vendor);

              items.push({
                name: prodName.charAt(0).toUpperCase() + prodName.slice(1),
                quantity: qty,
                final_price: rawPrice,
                hsn_or_sac: hsn,
                category_name: catName,
                tax_rate: taxRate,
                tax_id: taxId,
                pre_tax_price: preTaxUnit,
                tax_amount: taxAmount,
                item_total: preTaxTotal,
                cost_price: finalCp
              });
            }
          }
        }
      }
    }

    // Default fallback item if no products detected in raw prompt
    if (items.length === 0) {
      const hsn = '71179090';
      const catName = 'Bracelets & Decorative Items (3% GST)';
      const taxRate = 3;
      const taxId = getCorrectTaxId(hsn, isInterstate);
      const price = 800;
      const preTaxUnit = Math.round((price / 1.03) * 100) / 100;
      const taxAmount = Math.round((price - preTaxUnit) * 100) / 100;

      items.push({
        name: 'Sacred Product',
        quantity: 1,
        final_price: price,
        hsn_or_sac: hsn,
        category_name: catName,
        tax_rate: taxRate,
        tax_id: taxId,
        pre_tax_price: preTaxUnit,
        tax_amount: taxAmount,
        item_total: preTaxUnit,
        cost_price: 150
      });
    }

    const subtotal = items.reduce((acc, it) => acc + it.item_total, 0);
    const tax_total = items.reduce((acc, it) => acc + it.tax_amount, 0);
    const shipping_charge = 100;
    const cod_charge = payment_mode === 'COD' ? 50 : 0;
    const grand_total = items.reduce((acc, it) => acc + (it.final_price * it.quantity), 0) + shipping_charge + cod_charge;

    return NextResponse.json({
      success: true,
      data: {
        customer_name,
        phone,
        email: `${customer_name.toLowerCase().replace(/[^a-z]/g, '') || 'client'}@gmail.com`,
        address,
        city,
        state,
        pincode,
        payment_mode,
        vendor,
        discountPercent,
        discountAmount,
        astrologer_name,
        astrologer_phone,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_total: Math.round(tax_total * 100) / 100,
        shipping_charge,
        cod_charge,
        grand_total: Math.round(grand_total)
      }
    });
  } catch (err) {
    console.error('AI Order Parse Error:', err);
    return NextResponse.json({ success: false, error: 'Internal AI parsing error' }, { status: 500 });
  }
}
