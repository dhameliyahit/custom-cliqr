import { Search, Download, Filter, UserCheck, CheckSquare, X, Trash2, CheckCheck, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FilterBar({
  filters,
  onFilterChange,
  admins = [],
  selectedCount = 0,
  onOpenAssignModal,
  onDeleteSelected,
  onSelectByQuantity,
  onExport,
  onClearSelection,
  onOpenScanModal,
}) {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="space-y-3 mb-4">
      {/* Primary Filter Row matching user's wireframe */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Filter: "This Month Generate" */}
        <div className="w-full sm:w-auto min-w-[170px]">
          <select
            value={filters.period || 'this_month'}
            onChange={(e) => onFilterChange('period', e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all cursor-pointer shadow-2xs"
          >
            <option value="this_month">This Month Generate</option>
            <option value="today">Today</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_month">Last Month</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Admin Filter: "Admin wise Filter" (Super Admin only) */}
        {isSuperAdmin && (
          <div className="w-full sm:w-auto min-w-[170px]">
            <select
              value={filters.adminId || 'all'}
              onChange={(e) => onFilterChange('adminId', e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">Admin wise Filter (All)</option>
              <option value="unassigned">Unassigned Only</option>
              {admins.map((adm) => (
                <option key={adm._id} value={adm._id}>
                  {adm.name} {adm.company ? `(${adm.company})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div className="w-full sm:w-auto min-w-[140px]">
          <select
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">Status: All</option>
            <option value="configured">Configured / Active</option>
            <option value="assigned">Assigned / Empty</option>
            {isSuperAdmin && <option value="unassigned">Unassigned</option>}
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Search Input with Integrated Scan Button */}
        <div className="flex-1 min-w-[240px]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by QR code, Batch, Customer..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full h-10 pl-9 pr-24 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all shadow-2xs"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {filters.search && (
                <button
                  type="button"
                  onClick={() => onFilterChange('search', '')}
                  className="p-1 text-slate-400 hover:text-black rounded transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenScanModal}
                className="h-7 px-2.5 bg-black hover:bg-zinc-800 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer group"
                title="Scan QR Code or Upload Image to Search"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Quantity Select (Super Admin) */}
        {isSuperAdmin && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg p-1 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 hidden md:inline">Select Qty:</span>
            {[50, 100, 500].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => onSelectByQuantity && onSelectByQuantity(qty)}
                className="px-2 py-1 text-xs font-bold bg-white text-slate-700 hover:text-black hover:border-black border border-slate-200 rounded transition-colors cursor-pointer shadow-2xs"
                title={`Quick select ${qty} unassigned QR codes`}
              >
                {qty}
              </button>
            ))}
          </div>
        )}

        {/* SuperAdmin Quick Assign Button */}
        {isSuperAdmin && (
          <button
            onClick={onOpenAssignModal}
            className="h-10 px-3.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            title="Assign batch or selected QR links to Reseller Admin"
          >
            <UserCheck className="w-4 h-4" />
            <span>Assign to Admin</span>
          </button>
        )}

        {/* Export Buttons */}
        {/* Export Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => onExport('xlsx')}
            title="Export Excel Spreadsheet"
            className="h-10 px-3 bg-white border border-slate-300 hover:border-black text-black rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => onExport('csv')}
            title="Export CSV Spreadsheet"
            className="h-10 px-3 bg-white border border-slate-300 hover:border-black text-black rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => onExport('zip')}
            title="Download Bulk Print-Ready Vector SVGs with Centered Codes (ZIP Archive)"
            className="h-10 px-3 bg-white border border-slate-300 hover:border-black text-black rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">ZIP (SVGs)</span>
          </button>
        </div>
      </div>

      {/* Multi-select Action Bar */}
      {selectedCount > 0 && (
        <div className="bg-black text-white px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-md">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckSquare className="w-4 h-4 text-white" />
            <span>{selectedCount} item(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Selected QRs as ZIP */}
            <button
              onClick={() => onExport('zip')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download selected print-ready QR SVGs in a ZIP archive"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Download QRs ({selectedCount})</span>
            </button>

            {isSuperAdmin && (
              <>
                <button
                  onClick={onOpenAssignModal}
                  className="px-3 py-1.5 bg-white text-black hover:bg-slate-100 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign to Admin</span>
                </button>

                {/* [TEMP/CONFIGURABLE] Delete Selected QRs */}
                <button
                  onClick={onDeleteSelected}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete all selected QR links"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedCount})</span>
                </button>
              </>
            )}

            <button
              onClick={onClearSelection}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
