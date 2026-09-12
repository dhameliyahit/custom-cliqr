import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  Building2,
  Mail,
  Phone,
  QrCode,
  CheckCircle2,
  Package,
  Activity,
  ExternalLink,
  UserCheck,
  Edit2,
  Loader2,
  AlertCircle,
  Layers,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { getAdminDetails } from '../services/api';
import toast from 'react-hot-toast';

export default function AdminDetailsModal({
  isOpen,
  onClose,
  adminId,
  onAssign,
  onEdit,
  onToggleStatus,
}) {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && adminId) {
      setLoading(true);
      getAdminDetails(adminId)
        .then((res) => {
          if (res.success) {
            setDetails(res);
          } else {
            toast.error(res.message || 'Failed to load admin details');
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || err.message || 'Error loading admin');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, adminId]);

  if (!isOpen) return null;

  const admin = details?.admin;
  const batchBreakdown = details?.batchBreakdown || [];

  const handleNavigateToDashboard = () => {
    onClose();
    navigate(`/?adminId=${encodeURIComponent(adminId)}`);
  };

  const total = admin?.assignedCount || 1;
  const configuredPercent = Math.min(100, Math.round(((admin?.configuredCount || 0) / total) * 100));
  const availablePercent = Math.max(0, 100 - configuredPercent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {admin?.name ? admin.name[0].toUpperCase() : 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-black">
                  {admin?.name || 'Admin Performance'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    admin?.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {admin?.status === 'active' ? 'Active Partner' : 'Blocked'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{admin?.email}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{admin?.phone || '—'}</span>
                </span>
                {admin?.company && (
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{admin.company}</span>
                  </span>
                )}
              </div>
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
              <p className="text-xs font-medium">Loading partner performance...</p>
            </div>
          ) : !admin ? (
            <div className="py-16 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-black">Admin Not Found</p>
            </div>
          ) : (
            <>
              {/* KPI Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Assigned QRs
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {admin.assignedCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Total given to admin</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Active QRs
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {admin.configuredCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Client activated</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Ready to Sell
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {admin.availableCount?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">In admin inventory</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total Scans
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {admin.totalScans?.toLocaleString() || 0}
                  </p>
                  <span className="text-[10px] text-slate-400">Customer QR scans</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Activated %
                  </span>
                  <p className="text-xl font-mono font-black text-black">
                    {admin.sellThroughRate || 0}%
                  </p>
                  <span className="text-[10px] text-slate-400">Activation rate</span>
                </div>
              </div>

              {/* Visual Performance Progress Bar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Admin Sales Progress
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-600">
                    {admin.configuredCount || 0} Active ({configuredPercent}%) • {admin.availableCount || 0} Ready to Sell ({availablePercent}%)
                  </span>
                </div>

                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  {configuredPercent > 0 && (
                    <div
                      style={{ width: `${configuredPercent}%` }}
                      className="h-full bg-black transition-all"
                      title={`Active: ${admin.configuredCount} (${configuredPercent}%)`}
                    />
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <span>Active Customer QRs ({configuredPercent}%)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300"></span>
                    <span>Ready to Sell ({availablePercent}%)</span>
                  </span>
                </div>
              </div>

              {/* Batch Distribution Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-black" />
                    <span>Assigned Batches Held by this Admin</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {batchBreakdown.length} {batchBreakdown.length === 1 ? 'batch' : 'batches'} assigned
                  </span>
                </div>

                {batchBreakdown.length === 0 ? (
                  <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-black">No Batches Assigned Yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                      This admin currently has zero QR codes assigned to their account.
                    </p>
                    {onAssign && (
                      <button
                        onClick={() => {
                          onClose();
                          onAssign(admin);
                        }}
                        className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-zinc-800 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign QRs to Admin</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-2.5 px-3">Batch Code</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-center">Assigned QRs</th>
                          <th className="py-2.5 px-3 text-center">Active QRs</th>
                          <th className="py-2.5 px-3 text-center">Ready to Sell</th>
                          <th className="py-2.5 px-3 text-center">Total Scans</th>
                          <th className="py-2.5 px-3 text-center">Activated %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchBreakdown.map((item) => (
                          <tr key={item.batchCode} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {item.batchCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">
                              {item.description || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-black">
                              {item.totalAllocated}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-black">
                              {item.configuredCount}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-black">
                              {item.availableCount}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                              {item.totalScans}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-black border border-slate-200">
                                {item.sellThroughRate || 0}%
                              </span>
                            </td>
                          </tr>
                        ))}
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
            {onToggleStatus && admin && (
              <button
                onClick={() => onToggleStatus(admin)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  admin.status === 'active'
                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {admin.status === 'active' ? 'Suspend / Block Account' : 'Activate Account'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {onEdit && admin && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(admin);
                }}
                className="px-3 py-2 bg-white border border-slate-300 hover:border-black rounded-lg text-xs font-bold text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            <button
              onClick={handleNavigateToDashboard}
              className="px-3 py-2 bg-white border border-slate-300 hover:border-black rounded-lg text-xs font-bold text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View QRs on Dashboard</span>
            </button>

            {onAssign && admin && (
              <button
                onClick={() => {
                  onClose();
                  onAssign(admin);
                }}
                className="px-3.5 py-2 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign Inventory</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
