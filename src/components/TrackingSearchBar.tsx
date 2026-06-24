"use client";

interface TrackingSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: () => void;
  onDownloadInvoice: () => void;
  loading: boolean;
  downloadingInvoice: boolean;
}

export default function TrackingSearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  onDownloadInvoice,
  loading,
  downloadingInvoice,
}: TrackingSearchBarProps) {
  return (
    <div className="flex gap-3 mb-12 max-w-2xl mx-auto">
      <input
        type="text"
        className="form-input flex-1 p-3 text-lg bg-white dark:bg-[#16161f] text-gray-900 dark:text-white border-gray-300 dark:border-[#2a2a38] shadow-sm"
        placeholder="e.g. 1122345678722 or INV-1002"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
      />
      <button
        className="btn btn-primary px-8 text-lg flex items-center gap-2"
        onClick={onSearch}
        disabled={loading || !searchQuery.trim()}
      >
        {loading ? <span className="btn-spinner border-2 border-white border-t-transparent flex-shrink-0 w-5 h-5 rounded-full" /> : '🔍'}
        Search
      </button>
      <button
        className="btn bg-white dark:bg-[#16161f] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-[#2a2a38] hover:bg-gray-50 dark:hover:bg-[#1c1c28] px-6 text-lg flex items-center gap-2 transition-colors rounded-lg"
        onClick={onDownloadInvoice}
        disabled={downloadingInvoice || !searchQuery.trim()}
        title="Download Invoice"
      >
        {downloadingInvoice ? <span className="btn-spinner border-2 border-gray-400 dark:border-gray-500 border-t-transparent flex-shrink-0 w-5 h-5 rounded-full" /> : '📄'}
        Invoice
      </button>
    </div>
  );
}
