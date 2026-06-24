'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import OrderDetailsExpanded, { OrderData } from './OrderDetailsExpanded';
import { ordersService } from '@/services/orders';
import { zohoService } from '@/services/zoho';

type SearchType = 'orderId' | 'customer' | 'astrologer';

export default function SearchOrders() {
    const [searchType, setSearchType] = useState<SearchType>('orderId');
    const [searchQuery, setSearchQuery] = useState('');
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [downloadingInvoiceFor, setDownloadingInvoiceFor] = useState<string | null>(null);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    
    // Autocomplete states
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [disableAutocomplete, setDisableAutocomplete] = useState(false);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Handle outside click for autocomplete dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 700ms Debounce Autocomplete
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (disableAutocomplete || searchQuery.trim().length < 2 || searchType === 'orderId') {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimerRef.current = setTimeout(async () => {
            setSuggestionsLoading(true);
            try {
                const data = await ordersService.search(searchType, searchQuery.trim());
                if (data.success && data.orders) {
                    const uniqueNames = new Set<string>();
                    data.orders.forEach((o: any) => {
                        const name = searchType === 'customer' 
                            ? o.customerDetails?.customer_name 
                            : o.astrologerDetails?.astrologerName;
                        if (name) uniqueNames.add(name);
                    });
                    const results = Array.from(uniqueNames);
                    setSuggestions(results);
                    if (results.length > 0) setShowSuggestions(true);
                }
            } catch (err) {
                console.error('Error fetching suggestions', err);
            } finally {
                setSuggestionsLoading(false);
            }
        }, 700);

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchQuery, searchType, disableAutocomplete]);

    const toggleOrderExpand = (orderId: string, e: React.MouseEvent) => {
        // Only toggle if they click the card, not a button inside it
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;
        
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };

    const executeSearch = async (queryToSearch: string) => {
        if (!queryToSearch.trim()) return;
        
        setLoading(true);
        setErrorMsg('');
        setHasSearched(true);
        setShowSuggestions(false);
        setDisableAutocomplete(true);
        
        try {
            const data = await ordersService.search(searchType, queryToSearch.trim());

            if (!data.success) throw new Error((data as { error?: string }).error || 'Failed to fetch orders');

            setOrders((data.orders || []) as unknown as OrderData[]);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Unknown error occurred while searching');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchClick = () => {
        executeSearch(searchQuery);
    };

    const handleDownloadInvoice = async (orderId: string) => {
        if (!orderId) return;
        setDownloadingInvoiceFor(orderId);
        try {
            const res = await zohoService.getInvoicePdf(orderId);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to download invoice');
            }
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setDownloadingInvoiceFor(null);
        }
    };

    const getStatusClasses = (status: string) => {
        const s = status?.toUpperCase() || '';
        if (s.includes('DELIVERED')) return 'text-green-400 bg-green-400/10 border-green-500/20';
        if (s.includes('TRANSIT')) return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
        if (s.includes('RTO')) return 'text-red-400 bg-red-400/10 border-red-500/20';
        if (s.includes('DISPATCHED') || s.includes('SHIPPED')) return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20';
        return 'text-gray-400 bg-gray-400/10 border-gray-500/20';
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">
                    Search Orders
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Search effectively by Order ID, Customer Name, or Astrologer Name</p>
            </div>

            {/* Search Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-10 max-w-4xl mx-auto items-center">
                <div className="w-full md:w-auto shrink-0">
                    <select
                        className="form-input w-full md:w-48 p-3 text-lg bg-white dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] rounded-xl focus:ring-accent focus:border-accent transition-colors shadow-sm font-medium"
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as SearchType)}
                    >
                        <option value="orderId">Order ID</option>
                        <option value="customer">Customer Name</option>
                        <option value="astrologer">Astrologer Name</option>
                    </select>
                </div>
                
                <div className="flex-1 flex gap-3 w-full" ref={wrapperRef}>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            className="form-input w-full p-3 text-lg bg-white dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] shadow-sm rounded-xl"
                            placeholder={`Search by ${searchType === 'orderId' ? 'Order ID' : searchType === 'customer' ? 'Customer Name' : 'Astrologer Name'}...`}
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setDisableAutocomplete(false);
                                setHasSearched(false);
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleSearchClick()}
                            onFocus={() => {
                                if (suggestions.length > 0 && searchQuery.length >= 2 && !disableAutocomplete) {
                                    setShowSuggestions(true);
                                }
                            }}
                        />
                        {suggestionsLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="btn-spinner border-2 border-accent border-t-transparent flex-shrink-0 w-4 h-4 rounded-full" />
                            </div>
                        )}
                        
                        {/* Dropdown Suggestions */}
                        {showSuggestions && (
                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1c1c28] border border-gray-200 dark:border-[#2a2a38] rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="py-2">
                                    {suggestions.map((name, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="w-full text-left px-5 py-3 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a38] transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                setSearchQuery(name);
                                                setShowSuggestions(false);
                                                executeSearch(name);
                                            }}
                                        >
                                            {name}
                                            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        className="btn btn-primary px-6 text-lg flex items-center justify-center gap-2 min-w-[140px] rounded-xl shadow-md shrink-0"
                        onClick={handleSearchClick}
                        disabled={loading || !searchQuery.trim()}
                    >
                        {loading ? <span className="btn-spinner border-2 border-white border-t-transparent flex-shrink-0 w-5 h-5 rounded-full" /> : '🔍 Search'}
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="form-error max-w-2xl mx-auto mb-8">
                    {errorMsg}
                </div>
            )}

            {/* Results Grid */}
            {!loading && hasSearched && orders.length > 0 && (
                <div className="animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Search Results <span className="text-sm font-normal text-gray-500">({orders.length} found)</span>
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {orders.map((order) => {
                            const isDownloading = downloadingInvoiceFor === order.orderId;
                            
                            return (
                                <div 
                                    key={order._id} 
                                    className="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] p-6 rounded-2xl shadow-sm hover:shadow-lg hover:border-accent/40 dark:hover:border-accent/40 transition-all duration-300 relative group cursor-pointer"
                                    onClick={(e) => toggleOrderExpand(order._id, e)}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-start mb-6 gap-2">
                                        <div className="flex-1 flex items-center gap-3">
                                            <span className={`text-gray-400 text-xs transition-transform ${expandedOrders.has(order._id) ? 'rotate-90 text-accent' : ''}`}>▶</span>
                                            <div>
                                                <p className="text-[11px] text-gray-500 mb-1 uppercase tracking-widest font-bold">Order ID</p>
                                                <p className="text-gray-900 dark:text-white font-extrabold text-2xl group-hover:text-accent transition-colors">{order.orderId}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] px-3 py-1.5 rounded-full font-bold tracking-wider uppercase border shadow-sm ${getStatusClasses(order.status || '')}`}>
                                            {order.status?.replace(/_/g, ' ') || 'UNKNOWN'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-5 mb-6 pt-5 border-t border-gray-100 dark:border-[#2a2a38]">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Customer</p>
                                            <p className="text-base text-gray-900 dark:text-gray-100 font-bold">
                                                {order.customerDetails?.customer_name || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Astrologer</p>
                                            <p className="text-base text-gray-900 dark:text-gray-100 font-bold">
                                                {order.astrologerDetails?.astrologerName || '—'}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Date</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                    {new Date(order.createdAt || '').toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Waybill</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                    {order.waybill || 'Not Assigned'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {expandedOrders.has(order._id) && (
                                        <div className="mb-6 pt-2 border-t border-gray-100 dark:border-[#2a2a38]">
                                            <OrderDetailsExpanded order={order as any} />
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-100 dark:border-[#2a2a38] flex justify-between items-center bg-gray-50/50 dark:bg-[#16161f]/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                                        <Link 
                                            href={`/tracking`}
                                            className="text-sm font-bold text-accent hover:text-accent-hover flex items-center gap-1.5 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Track Shipment ➔
                                        </Link>
                                        <button
                                            className="btn bg-white dark:bg-[#1c1c28] hover:bg-gray-50 dark:hover:bg-[#2a2a38] text-gray-800 dark:text-white text-sm py-2 px-5 rounded-xl flex items-center gap-2 transition-all border border-gray-200 dark:border-[#3a3a4a] shadow-sm hover:shadow font-medium"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadInvoice(order.orderId);
                                            }}
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? <span className="btn-spinner border-2 border-accent border-t-transparent w-4 h-4 rounded-full" /> : '📄'}
                                            Download Invoice
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!loading && hasSearched && orders.length === 0 && (
                <div className="text-center py-12 text-gray-500 border border-dashed border-[#2a2a38] rounded-xl bg-white/50 dark:bg-[#16161f]/50">
                    <p className="text-lg font-medium mb-1">No orders found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search term or select a different search type.</p>
                </div>
            )}
        </div>
    );
}
