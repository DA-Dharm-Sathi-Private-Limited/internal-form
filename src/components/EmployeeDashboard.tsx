'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Award, 
  PlusCircle, 
  Calendar, 
  Layers, 
  Sparkles,
  UserCheck,
  Download,
  Search,
  X,
  Filter,
  Gem,
  PackageCheck,
  UserPlus
} from 'lucide-react';

interface MetricData {
  dailyRevenue: number;
  dailyProfit: number;
  yesterdayRevenue: number;
  weeklyRevenue: number;
  weeklyProfit: number;
  prevWeeklyRevenue: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  totalOrders: number;
  aov: number;
  onboardedClientsDaily?: number;
  onboardedClientsWeekly?: number;
  onboardedClientsMonthly?: number;
  onboardedClientsLifetime?: number;
  onboardedRevenueDaily?: number;
  onboardedRevenueWeekly?: number;
  onboardedRevenueMonthly?: number;
  onboardedRevenueLifetime?: number;
}

interface ChartPoint {
  date: string;
  displayDate: string;
  revenue: number;
  profit: number;
  orderCount: number;
}

interface CustomerRank {
  name: string;
  phone: string;
  city: string;
  orderCount: number;
  totalSpent: number;
  onboardedBy?: string;
}

interface ClientHistoryData {
  clientName: string;
  clientPhone: string;
  city: string;
  onboardedBy?: string;
  orderCount: number;
  totalRevenue: number;
  productBreakdown: {
    gemstones: number;
    rudraksha: number;
    crystals: number;
    bracelets: number;
    others: number;
  };
  items: {
    orderId: string;
    date: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
    hsn: string;
  }[];
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerRank[]>([]);
  const [categories, setCategories] = useState<{ name: string; value: number }[]>([]);
  const [clientTypes, setClientTypes] = useState<{ name: string; value: number }[]>([]);
  const [availableSalespersons, setAvailableSalespersons] = useState<string[]>([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('Muskan');
  const [activeHoverPoint, setActiveHoverPoint] = useState<ChartPoint | null>(null);

  // Line Chart Date Range Filter States
  const [chartDays, setChartDays] = useState<string>('30');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Client History Search Modal States
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [isSearchingClient, setIsSearchingClient] = useState<boolean>(false);
  const [clientHistory, setClientHistory] = useState<ClientHistoryData | null>(null);
  const [showClientModal, setShowClientModal] = useState<boolean>(false);

  const [userName, setUserName] = useState('Muskan');
  const [userEmail, setUserEmail] = useState('muskan@humarapandit.com');

  useEffect(() => {
    if (session?.user?.name) {
      setUserName(session.user.name.trim());
    } else if (typeof window !== 'undefined') {
      const local = localStorage.getItem('user_session_name');
      if (local) setUserName(local);
    }

    if (session?.user?.email) {
      setUserEmail(session.user.email);
    } else if (typeof window !== 'undefined') {
      const local = localStorage.getItem('user_session_email');
      if (local) setUserEmail(local);
    }
  }, [session]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      let url = `/api/employee/dashboard?salesperson=${encodeURIComponent(selectedSalesperson)}&email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}&days=${chartDays}`;
      if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMetrics(json.data.metrics);
        setChartData(json.data.chartData || []);
        setTopCustomers(json.data.topCustomers || []);
        setCategories(json.data.categories || []);
        setClientTypes(json.data.clientTypes || []);
        if (json.data.availableSalespersons && json.data.availableSalespersons.length > 0) {
          setAvailableSalespersons(json.data.availableSalespersons);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedSalesperson, startDate, endDate, chartDays]);

  const handleSearchClientHistory = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingClient(true);
    setShowClientModal(true);

    try {
      const res = await fetch(`/api/employee/dashboard?searchClient=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        setClientHistory(json.data);
      } else {
        setClientHistory(null);
      }
    } catch (err) {
      console.error('Error fetching client history:', err);
    } finally {
      setIsSearchingClient(false);
    }
  };

  const handleDownloadCSV = () => {
    window.open('/api/export-data?format=csv', '_blank');
  };

  // Safe SVG Line Path Calculations (Guaranteed no NaN coordinates)
  const safeChartData = Array.isArray(chartData) && chartData.length > 0
    ? chartData
    : [{ date: '2026-08-19', displayDate: '19 Aug', revenue: 0, profit: 0, orderCount: 0 }];

  const maxVal = Math.max(...safeChartData.map(d => Number(d.revenue) || 0), 100);
  const svgWidth = 800;
  const svgHeight = 220;
  const padding = 30;

  const points = safeChartData.map((d, i) => {
    const denom = Math.max(1, safeChartData.length - 1);
    const x = padding + (i / denom) * (svgWidth - padding * 2);
    const rev = Number(d.revenue) || 0;
    const y = svgHeight - padding - (rev / maxVal) * (svgHeight - padding * 2);
    return {
      x: isNaN(x) ? padding : x,
      y: isNaN(y) ? svgHeight - padding : y,
      data: d
    };
  });

  const lineD = points.length > 0
    ? points.reduce((acc, p, i, a) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = a[i - 1];
        const cx = (prev.x + p.x) / 2;
        return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
      }, '')
    : `M ${padding} ${svgHeight - padding} L ${svgWidth - padding} ${svgHeight - padding}`;

  const areaD = points.length > 0
    ? `${lineD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
    : '';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Executive Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-section)] to-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border)] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--accent-soft)] text-[var(--accent)] rounded-2xl border border-[var(--accent)] shadow-inner">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                Sales Executive Dashboard
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Live Production DB
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Client Onboarding Distinction, Repeat Invoicing & Performance Analytics
            </p>
          </div>
        </div>

        {/* Sales Executive Selector & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[var(--bg-input)] px-3 py-2 rounded-xl border border-[var(--border)] shadow-sm">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Executive:</span>
            <select
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              className="bg-transparent text-sm font-bold text-[var(--accent)] outline-none cursor-pointer"
            >
              <option value="Muskan" className="bg-gray-900 text-white font-semibold">Muskan</option>
              <option value="Tannu" className="bg-gray-900 text-white font-semibold">Tannu</option>
              {availableSalespersons
                .filter(sp => sp !== 'Muskan' && sp !== 'Tannu')
                .map((sp) => (
                  <option key={sp} value={sp} className="bg-gray-900 text-white font-semibold">
                    {sp}
                  </option>
                ))}
              <option value="All Sales Executives" className="bg-gray-950 text-amber-300 font-bold">
                🌐 All Sales Executives (Company Total)
              </option>
            </select>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV DB</span>
          </button>

          <Link
            href="/create-order"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create Order</span>
          </Link>
        </div>
      </div>

      {/* Client Search Bar */}
      <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-md flex items-center gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search Client Name / Phone for Purchase History & Onboarder Info..."
            value={clientSearchQuery}
            onChange={(e) => setClientSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClientHistory(clientSearchQuery)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-xs text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          onClick={() => handleSearchClientHistory(clientSearchQuery)}
          className="px-6 py-2.5 bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold rounded-xl cursor-pointer shadow whitespace-nowrap"
        >
          Search Client
        </button>
      </div>

      {/* NEW CLIENT ONBOARDING DISTINCTION BADGE PANEL WITH REVENUE BROUGHT BY NEW CLIENTS */}
      {selectedSalesperson !== 'All Sales Executives' && (
        <div className="bg-gradient-to-r from-purple-950/70 via-indigo-900/50 to-purple-950/70 border border-purple-500/40 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-500/30 pb-3">
            <div className="flex items-center gap-2 text-purple-200 font-bold text-base">
              <UserPlus className="w-5 h-5 text-amber-400" />
              <span>🌟 New Clients Onboarded by {selectedSalesperson} (First-Ever Purchase)</span>
            </div>
            <span className="text-[11px] text-purple-200/80 bg-purple-900/60 px-3 py-1 rounded-full border border-purple-400/30 font-medium">
              Tracks executive who originally brought the client
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            {/* Today */}
            <div className="p-4 bg-purple-900/50 border border-purple-400/30 rounded-2xl space-y-1 shadow">
              <span className="text-xs text-purple-200 block font-bold">Today Onboarded</span>
              <strong className="text-3xl font-black text-white">{metrics?.onboardedClientsDaily || 0}</strong>
              <span className="text-[11px] text-purple-300 block font-medium">New Clients</span>
              <div className="pt-2 border-t border-purple-500/20 text-xs font-bold text-amber-300">
                New Client Rev: ₹{(metrics?.onboardedRevenueDaily || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* This Week */}
            <div className="p-4 bg-purple-900/50 border border-purple-400/30 rounded-2xl space-y-1 shadow">
              <span className="text-xs text-purple-200 block font-bold">This Week</span>
              <strong className="text-3xl font-black text-amber-400">{metrics?.onboardedClientsWeekly || 0}</strong>
              <span className="text-[11px] text-purple-300 block font-medium">New Clients</span>
              <div className="pt-2 border-t border-purple-500/20 text-xs font-bold text-amber-300">
                New Client Rev: ₹{(metrics?.onboardedRevenueWeekly || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* This Month */}
            <div className="p-4 bg-purple-900/50 border border-purple-400/30 rounded-2xl space-y-1 shadow">
              <span className="text-xs text-purple-200 block font-bold">This Month</span>
              <strong className="text-3xl font-black text-emerald-400">{metrics?.onboardedClientsMonthly || 0}</strong>
              <span className="text-[11px] text-purple-300 block font-medium">New Clients</span>
              <div className="pt-2 border-t border-purple-500/20 text-xs font-bold text-emerald-300">
                New Client Rev: ₹{(metrics?.onboardedRevenueMonthly || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Lifetime */}
            <div className="p-4 bg-purple-900/50 border border-purple-400/30 rounded-2xl space-y-1 shadow">
              <span className="text-xs text-purple-200 block font-bold">Lifetime Total</span>
              <strong className="text-3xl font-black text-cyan-300">{metrics?.onboardedClientsLifetime || 0}</strong>
              <span className="text-[11px] text-purple-300 block font-medium">Onboarded Clients</span>
              <div className="pt-2 border-t border-purple-500/20 text-xs font-bold text-cyan-300">
                New Client Rev: ₹{(metrics?.onboardedRevenueLifetime || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHITE KPI CARDS WITH NEW CLIENT REVENUE & TOTAL REVENUE DISTINCTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue Card */}
        <div className="bg-white text-gray-900 border border-gray-200 p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Today's Revenue</span>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl font-bold">
              $
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <span className="text-2xl font-black text-gray-900 block">
              ₹{metrics ? metrics.dailyRevenue.toLocaleString('en-IN') : '0'}
            </span>
            <div className="pt-2 border-t border-gray-100 text-[11px] space-y-0.5 text-gray-600">
              <p>🌱 New Client Rev: <strong className="text-emerald-600">₹{(metrics?.onboardedRevenueDaily || 0).toLocaleString('en-IN')}</strong></p>
              <p>Net Profit: <strong className="text-emerald-600">₹{metrics ? metrics.dailyProfit.toLocaleString('en-IN') : '0'}</strong></p>
            </div>
          </div>
        </div>

        {/* Weekly Revenue Card */}
        <div className="bg-white text-gray-900 border border-gray-200 p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Last 7 Days Revenue</span>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <span className="text-2xl font-black text-gray-900 block">
              ₹{metrics ? metrics.weeklyRevenue.toLocaleString('en-IN') : '0'}
            </span>
            <div className="pt-2 border-t border-gray-100 text-[11px] space-y-0.5 text-gray-600">
              <p>🌱 New Client Rev: <strong className="text-purple-600">₹{(metrics?.onboardedRevenueWeekly || 0).toLocaleString('en-IN')}</strong></p>
              <p>Prev Week: ₹{metrics ? metrics.prevWeeklyRevenue.toLocaleString('en-IN') : '0'}</p>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <div className="bg-white text-gray-900 border border-gray-200 p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Monthly Revenue</span>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <span className="text-2xl font-black text-gray-900 block">
              ₹{metrics ? metrics.monthlyRevenue.toLocaleString('en-IN') : '0'}
            </span>
            <div className="pt-2 border-t border-gray-100 text-[11px] space-y-0.5 text-gray-600">
              <p>🌱 New Client Rev: <strong className="text-amber-600">₹{(metrics?.onboardedRevenueMonthly || 0).toLocaleString('en-IN')}</strong></p>
              <p>Net Profit: <strong className="text-amber-600">₹{metrics ? metrics.monthlyProfit.toLocaleString('en-IN') : '0'}</strong></p>
            </div>
          </div>
        </div>

        {/* Lifetime Revenue Card */}
        <div className="bg-white text-gray-900 border border-gray-200 p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Lifetime Revenue</span>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <span className="text-2xl font-black text-gray-900 block">
              ₹{metrics ? metrics.lifetimeRevenue.toLocaleString('en-IN') : '0'}
            </span>
            <div className="pt-2 border-t border-gray-100 text-[11px] space-y-0.5 text-gray-600">
              <p>🌱 New Client Rev: <strong className="text-indigo-600">₹{(metrics?.onboardedRevenueLifetime || 0).toLocaleString('en-IN')}</strong></p>
              <p>Orders: <strong>{metrics ? metrics.totalOrders : '0'}</strong> | AOV: ₹{metrics ? metrics.aov.toLocaleString('en-IN') : '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* REAL SMOOTH SVG LINE CHART WITH DATE FILTER IN HEADER */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-2xl shadow-xl space-y-4">
        {/* Chart Header Bar containing Date Range Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
              Sales & Revenue Line Chart ({selectedSalesperson})
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Real SVG Line Curve representing revenue history across dates
            </p>
          </div>

          {/* DATE RANGE FILTER & TIMEFRAME PRESETS INTEGRATED IN LINE CHART HEADER */}
          <div className="flex items-center gap-2 flex-wrap bg-[var(--bg-input)] p-2 rounded-xl border border-[var(--border)]">
            <div className="flex gap-1 mr-2">
              {[
                { key: '14', label: '14D' },
                { key: '30', label: '30D' },
                { key: '90', label: '90D' },
                { key: '365', label: '2026' },
                { key: 'all', label: 'All' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => { setChartDays(btn.key); setStartDate(''); setEndDate(''); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    chartDays === btn.key && !startDate && !endDate
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--bg-card)] text-gray-400 hover:text-white border border-[var(--border)]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-semibold border-l border-[var(--border)] pl-2">
              <Filter className="w-3.5 h-3.5 text-[var(--accent)]" /> Range:
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] outline-none font-mono cursor-pointer"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)] outline-none font-mono cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-400 hover:underline px-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Hover Tooltip */}
        {activeHoverPoint && (
          <div className="bg-[var(--accent-soft)] px-4 py-2 rounded-xl border border-[var(--accent)] text-xs text-[var(--accent)] font-bold animate-in fade-in flex items-center justify-between">
            <span>Date: {activeHoverPoint.displayDate}</span>
            <span>Revenue: ₹{activeHoverPoint.revenue.toLocaleString('en-IN')} ({activeHoverPoint.orderCount} Orders)</span>
          </div>
        )}

        {/* SVG SMOOTH CURVED LINE CHART GRAPH */}
        <div className="w-full overflow-x-auto pt-2">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-56">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Area Fill under the line */}
            <path d={areaD} fill="url(#chartGradient)" />

            {/* Main Smooth Curved SVG Line */}
            <path d={lineD} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />

            {/* Data Point Dots */}
            {points.map((p, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#1e1b4b"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  onMouseEnter={() => setActiveHoverPoint(p.data)}
                  className="transition-all hover:r-7 hover:fill-emerald-400"
                />
                <text
                  x={p.x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {p.data.displayDate}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Top Customer Ranks & Category Segregation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients Ranking */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Top Clients by Lifetime Revenue ({selectedSalesperson})
          </h3>
          <div className="space-y-3">
            {topCustomers.map((cust, idx) => (
              <div
                key={idx}
                onClick={() => handleSearchClientHistory(cust.phone || cust.name)}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-section)] hover:bg-[var(--bg-hover)] border border-[var(--border)] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-extrabold flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">{cust.name}</h4>
                    <span className="text-[11px] text-[var(--text-secondary)]">📱 {cust.phone} • {cust.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-400">₹{cust.totalSpent.toLocaleString('en-IN')}</span>
                  <span className="block text-[10px] text-[var(--text-secondary)]">{cust.orderCount} Orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Category & Client Type Breakdown */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 rounded-2xl shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-purple-400" />
              Product Category Revenue Distinction
            </h3>
            <div className="space-y-2.5">
              {categories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text-primary)]">{cat.name}</span>
                    <span className="text-[var(--accent)]">₹{cat.value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, (cat.value / (metrics?.lifetimeRevenue || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <h4 className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-3">Client Retention Split</h4>
            <div className="grid grid-cols-2 gap-3">
              {clientTypes.map((ct, idx) => (
                <div key={idx} className="p-3 bg-[var(--bg-section)] rounded-xl border border-[var(--border)] text-center">
                  <span className="text-xl font-black text-amber-400 block">{ct.value}</span>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{ct.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Client Search & History Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 bg-[var(--bg-section)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-base">
                <Gem className="w-5 h-5" />
                <span>Client Purchase History & Onboarding Distinction</span>
              </div>
              <button
                onClick={() => setShowClientModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {isSearchingClient ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Sparkles className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                  <p className="text-xs font-semibold">Searching client history...</p>
                </div>
              ) : clientHistory ? (
                <div className="space-y-6">
                  {/* Client Overview Card */}
                  <div className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)] flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">{clientHistory.clientName}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">📱 Phone: {clientHistory.clientPhone} • Location: {clientHistory.city}</p>
                      {clientHistory.onboardedBy && (
                        <span className="inline-block bg-purple-500/10 text-purple-400 text-[11px] font-bold px-2 py-0.5 rounded mt-1 border border-purple-500/30">
                          🌟 Originally Onboarded By: {clientHistory.onboardedBy}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-emerald-400 block">₹{clientHistory.totalRevenue.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-purple-300 font-semibold">{clientHistory.orderCount} Lifetime Orders</span>
                    </div>
                  </div>

                  {/* Product Type Breakdown */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-amber-400" /> Product Category Spend Breakdown
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl">
                        <span className="text-purple-300 block font-medium">💎 Gemstones</span>
                        <strong className="text-sm text-white">₹{clientHistory.productBreakdown.gemstones.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                        <span className="text-amber-300 block font-medium">📿 Rudraksha & Malas</span>
                        <strong className="text-sm text-white">₹{clientHistory.productBreakdown.rudraksha.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl">
                        <span className="text-blue-300 block font-medium">🔮 Crystals</span>
                        <strong className="text-sm text-white">₹{clientHistory.productBreakdown.crystals.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                        <span className="text-emerald-300 block font-medium">✨ Bracelets</span>
                        <strong className="text-sm text-white">₹{clientHistory.productBreakdown.bracelets.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl col-span-2 sm:col-span-1">
                        <span className="text-indigo-300 block font-medium">⚡ Vastu & Others</span>
                        <strong className="text-sm text-white">₹{clientHistory.productBreakdown.others.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Purchased Items List */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[var(--text-secondary)] mb-3">Itemized Purchase Log</h4>
                    <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden text-xs">
                      {clientHistory.items.map((it, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center bg-[var(--bg-section)]">
                          <div>
                            <span className="font-bold text-[var(--text-primary)] block">{it.name}</span>
                            <span className="text-[11px] text-[var(--text-secondary)]">Qty: {it.quantity} • HSN: {it.hsn}</span>
                          </div>
                          <div className="text-right font-bold text-emerald-400">
                            ₹{it.total.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-sm">No client history found for "{clientSearchQuery}". Try searching by phone number or exact name.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
