import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Layers,
  Users,
  QrCode,
  Activity,
  CheckCircle2,
  Package,
  Calendar,
  ExternalLink,
  Download,
  UserCheck,
  Loader2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { getBatchDetails } from '../services/api';
import toast from 'react-hot-toast';

export default function BatchDetailsModal({
  isOpen,
  onClose,
  batchCode,
  onAssign,
  onExport,
}) {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && batchCode) {
      setLoading(true);
      getBatchDetails(batchCode)
        .then((res) => {
          if (res.success) {
            setDetails(res);
          } else {
            toast.error(res.message || 'Failed to load batch details');
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || err.message || 'Error loading batch');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, batchCode]);

  if (!isOpen) return null;

  const batch = details?.batch;
  const adminBreakdown = details?.adminBreakdown || [];

  const handleNavigateToDashboard = () => {
    onClose();
    navigate(`/?batchCode=${encodeURIComponent(batchCode)}`);
  };

  // Percentages for visual bar
  const total = batch?.totalCount || 1;
  const configuredPercent = Math.min(100, Math.round(((batch?.configuredCount || 0) / total) * 100));
  const assignedPendingPercent = Math.min(
    100 - configuredPercent,
    Math.round((((batch?.assignedCount || 0) - (batch?.configuredCount || 0)) / total) * 100)
  );
  const unassignedPercent = Math.max(0, 100 - configuredPercent - assignedPendingPercent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base sm:text-lg text-black bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 select-all">
                  {batchCode}
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  Batch Analytics
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md truncate">
                {batch?.description || 'Production Batch Record'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-black" />
              <p className="text-xs font-medium">Loading batch analytics...</p>
            </div>
          ) : !batch ? (
            <div className="py-16 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-black">Batch Not Found</p>
            </div>
          ) : (
            <>
              {/* KPI Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total QRs
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {batch.totalCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">All generated</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Assigned
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {batch.assignedCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {Math.round(((batch.assignedCount || 0) / total) * 100)}% assigned
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    In Stock
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {batch.unassignedCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Ready to assign</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Active QRs
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {batch.configuredCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Client activated</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total Scans
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {batch.totalScans?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Customer scans</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Activated %
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {batch.sellThroughRate || 0}%
                  </p>
                  <span className="text-[10px] text-slate-400">Of assigned</span>
                </div>
              </div>

              {/* Visual Inventory Distribution Bar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Batch Status Breakdown
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    {batch.configuredCount || 0} Active • {(batch.assignedCount || 0) - (batch.configuredCount || 0)} Ready to Setup • {batch.unassignedCount || 0} In Stock
                  </span>
                </div>

                {/* Segmented Bar */}
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  {configuredPercent > 0 && (
                    <div
                      style={{ width: `${configuredPercent}%` }}
                      className="h-full bg-black transition-all"
                      title={`Active: ${batch.configuredCount} (${configuredPercent}%)`}
                    />
                  )}
                  {assignedPendingPercent > 0 && (
                    <div
                      style={{ width: `${assignedPendingPercent}%` }}
                      className="h-full bg-slate-400 transition-all"
                      title={`Assigned to Admin (Pending Setup): ${(batch.assignedCount || 0) - (batch.configuredCount || 0)} (${assignedPendingPercent}%)`}
                    />
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <span>Active Customer QRs ({configuredPercent}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span>Assigned to Admins ({assignedPendingPercent}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span>
                    <span>Unassigned In Stock ({unassignedPercent}%)</span>
                  </span>
                </div>
              </div>

              {/* Admin Allocation Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-black" />
                    <span>Admin Allocations from this Batch</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {adminBreakdown.length} {adminBreakdown.length === 1 ? 'admin' : 'admins'} assigned
                  </span>
                </div>

                {adminBreakdown.length === 0 ? (
                  <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-black">No Admins Assigned Yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                      All {batch.totalCount} QR codes in this batch are currently unassigned in stock.
                    </p>
                    {onAssign && (
                      <button
                        onClick={() => {
                          onClose();
                          onAssign(batch);
                        }}
                        className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-zinc-800 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign QRs Now</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-2.5 px-3">Admin Details</th>
                          <th className="py-2.5 px-3">Company</th>
                          <th className="py-2.5 px-3 text-center">Assigned QRs</th>
                          <th className="py-2.5 px-3 text-center">Active QRs</th>
                          <th className="py-2.5 px-3 text-center">Ready to Sell</th>
                          <th className="py-2.5 px-3 text-center">Total Scans</th>
                          <th className="py-2.5 px-3 text-center">Activated %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminBreakdown.map((item) => {
                          const rate =
                            item.totalAllocated > 0
                              ? Math.round((item.configuredCount / item.totalAllocated) * 100)
                              : 0;
                          return (
                            <tr key={item.adminId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3">
                                <div>
                                  <p className="font-bold text-black">{item.name || 'Admin'}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{item.email}</p>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {item.company || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-black">
                                {item.totalAllocated}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">
                                {item.configuredCount}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                {item.availableCount}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                                {item.totalScans}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rate >= 50
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rate > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Created {batch ? new Date(batch.createdAt).toLocaleDateString() : '—'}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Direct Dashboard Filter */}
            <button
              onClick={handleNavigateToDashboard}
              className="px-3 py-2 bg-white border border-slate-300 hover:border-black rounded-lg text-xs font-bold text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View QRs on Dashboard</span>
            </button>

            {/* Quick Assign */}
            {onAssign && batch && (
              <button
                onClick={() => {
                  onClose();
                  onAssign(batch);
                }}
                className="px-3.5 py-2 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign to Admin</span>
              </button>
            )}

            {/* Export Actions */}
            {onExport && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => onExport(batchCode, 'csv')}
                  className="px-2 py-1 hover:bg-slate-100 rounded text-xs font-bold text-slate-700 cursor-pointer"
                  title="Download CSV"
                >
                  CSV
                </button>
                <button
                  onClick={() => onExport(batchCode, 'xlsx')}
                  className="px-2 py-1 hover:bg-slate-100 rounded text-xs font-bold text-slate-700 cursor-pointer"
                  title="Download Excel"
                >
                  Excel
                </button>
                <button
                  onClick={() => onExport(batchCode, 'zip')}
                  className="px-2 py-1 bg-zinc-900 text-white hover:bg-zinc-800 rounded text-xs font-bold cursor-pointer"
                  title="Download Vector SVGs ZIP"
                >
                  ZIP
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
