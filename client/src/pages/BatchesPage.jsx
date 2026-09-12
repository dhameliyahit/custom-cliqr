import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Download,
  RefreshCw,
  Plus,
  UserCheck,
  Calendar,
  Search,
  Sparkles,
  QrCode,
  Eye,
  Activity,
  CheckCircle2,
  Package,
  Filter,
  ArrowUpDown,
  RotateCcw,
  ExternalLink,
  Percent,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { downloadExportFile } from '../services/api';
import AssignModal from '../components/AssignModal';
import GenerateQrModal from '../components/GenerateQrModal';
import BatchDetailsModal from '../components/BatchDetailsModal';
import toast from 'react-hot-toast';

export default function BatchesPage() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | has_pool | fully_assigned | active | scanned
  const [periodFilter, setPeriodFilter] = useState('all'); // all | this_month | last_30_days | this_year
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | volume_desc | assigned_desc | configured_desc | scans_desc | rate_desc

  // Modal States
  const [assignBatch, setAssignBatch] = useState(null);
  const [inspectBatchCode, setInspectBatchCode] = useState(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/qr/batches');
      if (data.success) {
        setBatches(data.batches || []);
        if (data.kpis) {
          setKpis(data.kpis);
        } else {
          // Client-side fallback calculation if kpis not directly provided
          let vol = 0;
          let asg = 0;
          let pool = 0;
          let cfg = 0;
          let scn = 0;
          (data.batches || []).forEach((b) => {
            vol += b.totalCount || 0;
            asg += b.assignedCount || 0;
            pool += b.unassignedCount || 0;
            cfg += b.configuredCount || 0;
            scn += b.totalScans || 0;
          });
          setKpis({
            totalBatches: (data.batches || []).length,
            totalVolume: vol,
            totalAssigned: asg,
            totalUnassigned: pool,
            totalConfigured: cfg,
            totalScans: scn,
            overallAllocationRate: vol > 0 ? ((asg / vol) * 100).toFixed(1) : 0,
            overallActivationRate: vol > 0 ? ((cfg / vol) * 100).toFixed(1) : 0,
          });
        }
      }
    } catch (err) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleExportBatch = async (batchCode, format = 'csv') => {
    try {
      const isZip = format === 'zip';
      toast.loading(
        isZip
          ? `Generating print-ready SVGs ZIP for ${batchCode}...`
          : `Preparing ${batchCode} (${format.toUpperCase()})...`,
        { id: 'batch-export-toast' }
      );
      await downloadExportFile({
        format,
        batchCode,
      });
      toast.success(
        isZip
          ? `ZIP archive for ${batchCode} downloaded!`
          : `${batchCode} (${format.toUpperCase()}) exported!`,
        { id: 'batch-export-toast' }
      );
    } catch (err) {
      console.error('Batch export error:', err);
      toast.error('Failed to export batch file', { id: 'batch-export-toast' });
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPeriodFilter('all');
    setSortBy('newest');
  };

  // Filtered & Sorted Batches
  const filteredBatches = useMemo(() => {
    let result = [...batches];

    // 1. Text Search (Batch Code or Description)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.batchCode.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }

    // 2. Status / Inventory Filter
    if (statusFilter === 'has_pool') {
      result = result.filter((b) => (b.unassignedCount || 0) > 0);
    } else if (statusFilter === 'fully_assigned') {
      result = result.filter((b) => (b.unassignedCount || 0) === 0);
    } else if (statusFilter === 'active') {
      result = result.filter((b) => (b.configuredCount || 0) > 0);
    } else if (statusFilter === 'scanned') {
      result = result.filter((b) => (b.totalScans || 0) > 0);
    }

    // 3. Date / Period Filter
    if (periodFilter !== 'all') {
      const now = new Date();
      if (periodFilter === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((b) => new Date(b.createdAt) >= startOfMonth);
      } else if (periodFilter === 'last_30_days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter((b) => new Date(b.createdAt) >= thirtyDaysAgo);
      } else if (periodFilter === 'this_year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        result = result.filter((b) => new Date(b.createdAt) >= startOfYear);
      }
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'volume_desc') return (b.totalCount || 0) - (a.totalCount || 0);
      if (sortBy === 'assigned_desc') return (b.assignedCount || 0) - (a.assignedCount || 0);
      if (sortBy === 'configured_desc') return (b.configuredCount || 0) - (a.configuredCount || 0);
      if (sortBy === 'scans_desc') return (b.totalScans || 0) - (a.totalScans || 0);
      if (sortBy === 'rate_desc') return (b.sellThroughRate || 0) - (a.sellThroughRate || 0);
      return 0;
    });

    return result;
  }, [batches, search, statusFilter, periodFilter, sortBy]);

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || periodFilter !== 'all' || sortBy !== 'newest';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-black" />
            <span>QR Production Batches & Inventory Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor bulk production lots, track reseller allocation ratios, inspect market conversion, and export printing packages.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchBatches}
            className="p-2.5 bg-white border border-slate-300 hover:border-black rounded-lg text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh batches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsGenerateOpen(true)}
              className="flex-1 sm:flex-initial h-10 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Complete Analytics KPI Bar */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* KPI 1: Total Batches */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Batches
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalBatches?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">Created batches</span>
          </div>

          {/* KPI 2: Total Volume */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total QR Codes
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalVolume?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">All generated QRs</span>
          </div>

          {/* KPI 3: Allocated to Admins */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Assigned to Admins
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalAssigned?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">
              {kpis.overallAllocationRate}% of total
            </span>
          </div>

          {/* KPI 4: Active / Configured */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Customer QRs
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalConfigured?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">
              {kpis.overallActivationRate}% activated
            </span>
          </div>

          {/* KPI 5: In Stock / Unassigned */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Unassigned Stock
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalUnassigned?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">Ready to assign</span>
          </div>

          {/* KPI 6: Total Scans */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Scans
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalScans?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">Customer QR scans</span>
          </div>
        </div>
      )}

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Batch Code (e.g. BATCH-2026) or Description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base input-search"
            />
          </div>

          {/* Dropdown Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Allocation Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-base"
              >
                <option value="all">All Batches</option>
                <option value="has_pool">Has Stock Left (&gt; 0)</option>
                <option value="fully_assigned">All Assigned (100%)</option>
                <option value="active">Has Active QRs (&gt; 0)</option>
                <option value="scanned">Has Scans (&gt; 0)</option>
              </select>
            </div>

            {/* Time Period Filter */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="select-base"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_year">This Year</option>
            </select>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-base"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="volume_desc">Sort: Largest Batch Size</option>
                <option value="assigned_desc">Sort: Most Assigned</option>
                <option value="configured_desc">Sort: Most Active QRs</option>
                <option value="rate_desc">Sort: Highest % Activated</option>
                <option value="scans_desc">Sort: Most Scanned</option>
              </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-reset"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Count Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-black font-mono">{filteredBatches.length}</strong> of{' '}
            <strong className="text-black font-mono">{batches.length}</strong> batches
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Filters Active
            </span>
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[320px]">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4 font-bold">Batch Code</th>
                <th className="py-3 px-4 font-bold">Description</th>
                <th className="py-3 px-4 font-bold text-center">Total QRs</th>
                <th className="py-3 px-4 font-bold">Status Breakdown</th>
                <th className="py-3 px-4 font-bold text-center">Assigned</th>
                <th className="py-3 px-4 font-bold text-center">In Stock</th>
                <th className="py-3 px-4 font-bold text-center">Active QRs</th>
                <th className="py-3 px-4 font-bold text-center">Total Scans</th>
                <th className="py-3 px-4 font-bold text-center">Date Created</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-black mb-2"></div>
                    <p className="text-xs font-medium">Loading batch records...</p>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-black">No Batches Match Filters</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">
                      Try clearing or changing your search criteria.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleResetFilters}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const bTotal = batch.totalCount || 1;
                  const cfgPct = Math.min(100, Math.round(((batch.configuredCount || 0) / bTotal) * 100));
                  const asgPendingPct = Math.min(
                    100 - cfgPct,
                    Math.round((((batch.assignedCount || 0) - (batch.configuredCount || 0)) / bTotal) * 100)
                  );
                  const poolPct = Math.max(0, 100 - cfgPct - asgPendingPct);

                  return (
                    <tr key={batch._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Batch Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs sm:text-sm text-black bg-slate-100 px-2 py-1 rounded-md border border-slate-200 select-all">
                            {batch.batchCode}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate font-medium">
                        {batch.description || <span className="text-slate-400 italic">No notes</span>}
                      </td>

                      {/* Total Volume */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-black text-sm text-black">
                          {batch.totalCount?.toLocaleString()}
                        </span>
                      </td>

                      {/* Visual Segmented Inventory Ratio Bar */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                            {cfgPct > 0 && (
                              <div
                                style={{ width: `${cfgPct}%` }}
                                className="h-full bg-black"
                                title={`Active: ${batch.configuredCount} (${cfgPct}%)`}
                              />
                            )}
                            {asgPendingPct > 0 && (
                              <div
                                style={{ width: `${asgPendingPct}%` }}
                                className="h-full bg-slate-400"
                                title={`Assigned (Ready): ${batch.assignedCount - batch.configuredCount} (${asgPendingPct}%)`}
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span className="font-bold text-black">{cfgPct}% active</span>
                            <span>{batch.configuredCount || 0} of {batch.totalCount}</span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned to Admins */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-black">
                          {batch.assignedCount?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* In Stock (Unassigned) */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-black">
                          {batch.unassignedCount?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Active QRs */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-black">
                          {batch.configuredCount?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Total Scans */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs text-slate-700">
                          {batch.totalScans?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-medium">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Batch Drilldown Modal */}
                          <button
                            onClick={() => setInspectBatchCode(batch.batchCode)}
                            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="Inspect batch analytics & partner allocations"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Assign */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => setAssignBatch(batch)}
                              className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Assign links from this batch to Admin"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Export Dropdown / Buttons */}
                          <button
                            onClick={() => handleExportBatch(batch.batchCode, 'csv')}
                            className="h-8 px-2 bg-black text-white hover:bg-zinc-800 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Export CSV"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExportBatch(batch.batchCode, 'xlsx')}
                            className="h-8 px-2 bg-white text-black border border-slate-300 hover:border-black rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Export Excel"
                          >
                            XLSX
                          </button>
                          <button
                            onClick={() => handleExportBatch(batch.batchCode, 'zip')}
                            className="h-8 px-2 bg-zinc-900 text-amber-400 hover:bg-zinc-800 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Export Print-Ready SVGs ZIP"
                          >
                            ZIP
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <GenerateQrModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onSuccess={fetchBatches}
      />

      <AssignModal
        isOpen={!!assignBatch}
        onClose={() => setAssignBatch(null)}
        batches={batches}
        initialBatchCode={assignBatch?.batchCode || ''}
        onSuccess={fetchBatches}
      />

      <BatchDetailsModal
        isOpen={!!inspectBatchCode}
        onClose={() => setInspectBatchCode(null)}
        batchCode={inspectBatchCode}
        onAssign={(b) => setAssignBatch(b)}
        onExport={handleExportBatch}
      />
    </div>
  );
}
