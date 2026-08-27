import { NextRequest, NextResponse } from 'next/server';
import Order from '@/models/Order';
import connectDB from '@/lib/mongodb';
import { getPersistentOrders } from '@/lib/persistent-orders';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const salespersonFilter = searchParams.get('salesperson') || searchParams.get('name') || '';
    const startDateParam = searchParams.get('startDate') || '';
    const endDateParam = searchParams.get('endDate') || '';
    const searchClient = searchParams.get('searchClient') || '';

    let dbOrders: any[] = [];
    try {
      const conn = await connectDB();
      if (conn) {
        dbOrders = await Order.find({}).sort({ createdAt: -1 }).lean();
      }
    } catch (err) {
      console.warn('[Dashboard API] DB Connection Notice:', err);
    }

    const localOrders = getPersistentOrders();
    const orderMap = new Map<string, any>();
    [...dbOrders, ...localOrders].forEach(o => {
      const key = o.orderId || o.zohoInvoiceId || String(o._id);
      if (!orderMap.has(key)) {
        orderMap.set(key, o);
      }
    });

    const rawOrders = Array.from(orderMap.values());

    // Clean trimmed salesperson names (exact raw salesperson matching)
    const allOrders = rawOrders.map(o => {
      const sp = (o.salespersonName || '').trim();
      return { ...o, salespersonName: sp };
    });

    // Build Master Client Onboarding Map (First ever order determines who onboarded the client)
    const clientOnboarderMap: Record<string, { onboardedBy: string; firstOrderDate: Date; firstOrderRevenue: number }> = {};
    const sortedAllOrders = [...allOrders].sort((a, b) => {
      const dA = new Date(a.createdAt || a.invoiceDate || 0).getTime();
      const dB = new Date(b.createdAt || b.invoiceDate || 0).getTime();
      return dA - dB;
    });

    sortedAllOrders.forEach(o => {
      const custName = o.customerDetails?.customer_name?.trim() || '';
      const custPhone = o.customerDetails?.phone?.trim() || '';
      const custKey = (custPhone && custPhone !== 'N/A' && custPhone !== '9983631551')
        ? custPhone
        : custName.toLowerCase();

      if (custKey && !clientOnboarderMap[custKey]) {
        const oDate = new Date(o.createdAt || o.invoiceDate || new Date());
        const onboarder = (o.salespersonName || 'Direct').trim();

        clientOnboarderMap[custKey] = {
          onboardedBy: onboarder,
          firstOrderDate: oDate,
          firstOrderRevenue: Number(o.invoiceTotal) || 0
        };
      }
    });

    // Handle Client Search API mode
    if (searchClient) {
      const queryLower = searchClient.toLowerCase().trim();
      const clientOrders = allOrders.filter(o => {
        const name = (o.customerDetails?.customer_name || '').toLowerCase();
        const phone = (o.customerDetails?.phone || '').toLowerCase();
        return name.includes(queryLower) || phone.includes(queryLower);
      });

      let totalRevenue = 0;
      const productBreakdown = {
        gemstones: 0,
        rudraksha: 0,
        crystals: 0,
        bracelets: 0,
        others: 0
      };

      const itemList: any[] = [];

      clientOrders.forEach(o => {
        const rev = Number(o.invoiceTotal) || 0;
        totalRevenue += rev;

        if (Array.isArray(o.invoiceItems)) {
          o.invoiceItems.forEach((it: any) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.final_price) || Number(it.rate) || 0;
            const amt = price * qty;
            const nameLower = (it.name || '').toLowerCase();
            const hsn = String(it.hsn_or_sac || '');

            itemList.push({
              orderId: o.orderId,
              date: o.createdAt || o.invoiceDate,
              name: it.name,
              quantity: qty,
              price: price,
              total: amt,
              hsn
            });

            if (hsn === '14049070' || /rudraksh|mukhi|tulsi|mala/i.test(nameLower)) {
              productBreakdown.rudraksha += amt;
            } else if (hsn === '05080010' || /moti|pearl|ruby|manik|sapphire|neelam|panna|emerald|pukhraj|coral|moonga|gemstone/i.test(nameLower)) {
              productBreakdown.gemstones += amt;
            } else if (/crystal|sphatik|quartz|amethyst|topaz/i.test(nameLower)) {
              productBreakdown.crystals += amt;
            } else if (hsn === '71179090' || /bracelet|anklet|ring/i.test(nameLower)) {
              productBreakdown.bracelets += amt;
            } else {
              productBreakdown.others += amt;
            }
          });
        }
      });

      const primaryCustKey = clientOrders[0]?.customerDetails?.phone || clientOrders[0]?.customerDetails?.customer_name?.toLowerCase();
      const onboardedByInfo = primaryCustKey ? clientOnboarderMap[primaryCustKey]?.onboardedBy : 'Unknown';

      return NextResponse.json({
        success: true,
        data: {
          clientName: clientOrders[0]?.customerDetails?.customer_name || searchClient,
          clientPhone: clientOrders[0]?.customerDetails?.phone || '',
          city: clientOrders[0]?.customerDetails?.city || '',
          onboardedBy: onboardedByInfo,
          orderCount: clientOrders.length,
          totalRevenue: Math.round(totalRevenue),
          productBreakdown: {
            gemstones: Math.round(productBreakdown.gemstones),
            rudraksha: Math.round(productBreakdown.rudraksha),
            crystals: Math.round(productBreakdown.crystals),
            bracelets: Math.round(productBreakdown.bracelets),
            others: Math.round(productBreakdown.others)
          },
          items: itemList
        }
      });
    }

    // Extract unique active salespersons
    const availableSalespersons = Array.from(
      new Set(allOrders.map(o => o.salespersonName).filter(Boolean))
    )
      .filter(sp => sp !== 'UNASSIGNED')
      .sort();

    // Filter by salesperson if selected (exact strict match)
    let targetOrders = allOrders;
    const isFilteredBySalesperson = salespersonFilter && salespersonFilter.toLowerCase() !== 'all' && salespersonFilter !== 'All Sales Executives';
    if (isFilteredBySalesperson) {
      const spTarget = salespersonFilter.trim().toLowerCase();
      targetOrders = allOrders.filter(o => {
        const sp = (o.salespersonName || '').trim().toLowerCase();
        return sp === spTarget;
      });
    }

    // Date Filtering Logic (From - To Date)
    if (startDateParam) {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      targetOrders = targetOrders.filter(o => {
        const oDate = new Date(o.createdAt || o.invoiceDate || 0);
        return oDate >= start;
      });
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      targetOrders = targetOrders.filter(o => {
        const oDate = new Date(o.createdAt || o.invoiceDate || 0);
        return oDate <= end;
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const prevWeekStart = new Date(now);
    prevWeekStart.setDate(now.getDate() - 14);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let dailyRevenue = 0;
    let dailyProfit = 0;
    let yesterdayRevenue = 0;

    let weeklyRevenue = 0;
    let weeklyProfit = 0;
    let prevWeeklyRevenue = 0;

    let monthlyRevenue = 0;
    let monthlyProfit = 0;
    let lifetimeRevenue = 0;
    let lifetimeProfit = 0;

    // Calculate Onboarded Clients & Revenue Breakdown for the selected salesperson
    let onboardedClientsDaily = 0;
    let onboardedClientsWeekly = 0;
    let onboardedClientsMonthly = 0;
    let onboardedClientsLifetime = 0;

    let onboardedRevenueDaily = 0;
    let onboardedRevenueWeekly = 0;
    let onboardedRevenueMonthly = 0;
    let onboardedRevenueLifetime = 0;

    if (isFilteredBySalesperson) {
      const spTarget = salespersonFilter.trim().toLowerCase();
      Object.values(clientOnboarderMap).forEach(info => {
        if (info.onboardedBy.trim().toLowerCase() === spTarget) {
          onboardedClientsLifetime++;
          onboardedRevenueLifetime += info.firstOrderRevenue;

          if (info.firstOrderDate >= todayStart) {
            onboardedClientsDaily++;
            onboardedRevenueDaily += info.firstOrderRevenue;
          }
          if (info.firstOrderDate >= weekStart) {
            onboardedClientsWeekly++;
            onboardedRevenueWeekly += info.firstOrderRevenue;
          }
          if (info.firstOrderDate >= monthStart) {
            onboardedClientsMonthly++;
            onboardedRevenueMonthly += info.firstOrderRevenue;
          }
        }
      });
    } else {
      Object.values(clientOnboarderMap).forEach(info => {
        onboardedClientsLifetime++;
        onboardedRevenueLifetime += info.firstOrderRevenue;
        if (info.firstOrderDate >= todayStart) {
          onboardedClientsDaily++;
          onboardedRevenueDaily += info.firstOrderRevenue;
        }
        if (info.firstOrderDate >= weekStart) {
          onboardedClientsWeekly++;
          onboardedRevenueWeekly += info.firstOrderRevenue;
        }
        if (info.firstOrderDate >= monthStart) {
          onboardedClientsMonthly++;
          onboardedRevenueMonthly += info.firstOrderRevenue;
        }
      });
    }

    const customerMap: Record<string, { name: string; phone: string; city: string; orderCount: number; totalSpent: number; lastOrderDate: Date; onboardedBy: string }> = {};
    const categoryMap: Record<string, number> = {};
    const clientTypeMap: Record<string, number> = { 'Repeat VIP Clients': 0, 'New Clients': 0 };
    const paymentModeMap: Record<string, number> = { Prepaid: 0, COD: 0 };

    // Dynamic Chart Data Generation (Respects Custom Date Range if specified)
    const dailyChartMap: Record<string, { date: string; displayDate: string; revenue: number; profit: number; orderCount: number }> = {};
    
    let chartDays = 14;
    let chartStartDate = new Date(todayStart);
    chartStartDate.setDate(chartStartDate.getDate() - 13);

    if (startDateParam && endDateParam) {
      chartStartDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      chartDays = Math.max(1, Math.ceil((endDate.getTime() - chartStartDate.getTime()) / (1000 * 3600 * 24)) + 1);
    }

    for (let i = 0; i < chartDays; i++) {
      const d = new Date(chartStartDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      dailyChartMap[dateKey] = { date: dateKey, displayDate, revenue: 0, profit: 0, orderCount: 0 };
    }

    targetOrders.forEach(o => {
      const oDate = new Date(o.createdAt || o.invoiceDate || now);
      const dateKey = oDate.toISOString().split('T')[0];

      let orderRevenue = typeof o.invoiceTotal === 'number' ? o.invoiceTotal : 0;
      let orderCost = 0;

      if (Array.isArray(o.invoiceItems)) {
        let itemsSum = 0;
        o.invoiceItems.forEach((it: any) => {
          const itemQty = Number(it.quantity) || 1;
          const itemFinal = Number(it.final_price) || Number(it.rate) || 0;
          const itemCost = Number(it.cost_price) || Math.round(itemFinal * 0.4);
          itemsSum += itemFinal * itemQty;
          orderCost += itemCost * itemQty;

          const hsn = String(it.hsn_or_sac || '');
          let cat = 'Bracelets & Decorative';
          if (hsn === '14049070' || /rudraksh|mala/i.test(it.name || '')) cat = 'Rudrakshas & Malas';
          else if (hsn === '05080010' || /gemstone|moti|crystal/i.test(it.name || '')) cat = 'Gemstones & Crystals';
          else if (hsn === '74198090' || hsn === '83062990' || /vastu|yantra/i.test(it.name || '')) cat = 'Vastu Copper & Metal';
          else if (hsn === '999591' || /pooja|puja|services/i.test(it.name || '')) cat = 'Poojas & Services';

          categoryMap[cat] = (categoryMap[cat] || 0) + (itemFinal * itemQty);
        });

        if (!orderRevenue) orderRevenue = itemsSum;
      }

      const orderProfit = Math.max(0, orderRevenue - orderCost);

      lifetimeRevenue += orderRevenue;
      lifetimeProfit += orderProfit;

      if (dailyChartMap[dateKey]) {
        dailyChartMap[dateKey].revenue += orderRevenue;
        dailyChartMap[dateKey].profit += orderProfit;
        dailyChartMap[dateKey].orderCount += 1;
      }

      if (oDate >= todayStart) {
        dailyRevenue += orderRevenue;
        dailyProfit += orderProfit;
      } else if (oDate >= yesterdayStart && oDate < todayStart) {
        yesterdayRevenue += orderRevenue;
      }

      if (oDate >= weekStart) {
        weeklyRevenue += orderRevenue;
        weeklyProfit += orderProfit;
      } else if (oDate >= prevWeekStart && oDate < weekStart) {
        prevWeeklyRevenue += orderRevenue;
      }

      if (oDate >= monthStart) {
        monthlyRevenue += orderRevenue;
        monthlyProfit += orderProfit;
      }

      const pm = o.paymentMode === 'COD' ? 'COD' : 'Prepaid';
      paymentModeMap[pm] = (paymentModeMap[pm] || 0) + 1;

      // Customer aggregation
      const custName = o.customerDetails?.customer_name?.trim() || 'Direct Client';
      const custPhone = o.customerDetails?.phone?.trim() || 'N/A';
      const custKey = (custPhone && custPhone !== 'N/A') ? custPhone : custName.toLowerCase();
      const onboardedBy = clientOnboarderMap[custKey]?.onboardedBy || o.salespersonName || 'Direct';

      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          name: custName,
          phone: custPhone,
          city: o.customerDetails?.city || o.customerDetails?.state || 'India',
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: oDate,
          onboardedBy
        };
      }
      customerMap[custKey].orderCount += 1;
      customerMap[custKey].totalSpent += orderRevenue;
      if (oDate > customerMap[custKey].lastOrderDate) {
        customerMap[custKey].lastOrderDate = oDate;
      }
    });

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    Object.values(customerMap).forEach(c => {
      if (c.orderCount > 1) {
        clientTypeMap['Repeat VIP Clients'] += 1;
      } else {
        clientTypeMap['New Clients'] += 1;
      }
    });

    const chartData = Object.values(dailyChartMap);
    const totalOrders = targetOrders.length;
    const aov = totalOrders > 0 ? Math.round(lifetimeRevenue / totalOrders) : 0;

    return NextResponse.json({
      success: true,
      data: {
        availableSalespersons,
        selectedSalesperson: salespersonFilter || 'All Sales Executives',
        metrics: {
          dailyRevenue: Math.round(dailyRevenue),
          dailyProfit: Math.round(dailyProfit),
          yesterdayRevenue: Math.round(yesterdayRevenue),
          weeklyRevenue: Math.round(weeklyRevenue),
          weeklyProfit: Math.round(weeklyProfit),
          prevWeeklyRevenue: Math.round(prevWeeklyRevenue),
          monthlyRevenue: Math.round(monthlyRevenue || lifetimeRevenue),
          monthlyProfit: Math.round(monthlyProfit || lifetimeProfit),
          lifetimeRevenue: Math.round(lifetimeRevenue),
          lifetimeProfit: Math.round(lifetimeProfit),
          totalOrders,
          aov,
          // New Client Onboarding Counts
          onboardedClientsDaily,
          onboardedClientsWeekly,
          onboardedClientsMonthly,
          onboardedClientsLifetime,
          // New Client Revenue Distinction
          onboardedRevenueDaily: Math.round(onboardedRevenueDaily),
          onboardedRevenueWeekly: Math.round(onboardedRevenueWeekly),
          onboardedRevenueMonthly: Math.round(onboardedRevenueMonthly),
          onboardedRevenueLifetime: Math.round(onboardedRevenueLifetime)
        },
        chartData,
        topCustomers,
        categories: Object.entries(categoryMap).map(([name, value]) => ({ name, value: Math.round(value) })),
        clientTypes: Object.entries(clientTypeMap).map(([name, value]) => ({ name, value })),
        paymentModes: Object.entries(paymentModeMap).map(([name, value]) => ({ name, value }))
      }
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}
