import { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  UserCheck,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  RefreshCw,
  Building2,
  Phone,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AssignModal({
  isOpen,
  onClose,
  selectedLinkIds = [],
  batches = [],
  initialBatchCode = '',
  initialAdminId = '',
  onSuccess,
}) {
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assignMode, setAssignMode] = useState('selected'); // 'selected' | 'batch_qty'
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAdmins, setFetchingAdmins] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');

  // Track previous isOpen state to only trigger initialize & fetch on modal open transition
  const prevIsOpenRef = useRef(false);

  // Fetch Admins list (isolated, safe, no infinite re-triggers)
  const fetchAdmins = async (preferredAdminId = '') => {
    setFetchingAdmins(true);
    try {
      const { data } = await api.get('/admins');
      if (data.success && Array.isArray(data.admins)) {
        setAdmins(data.admins);
        // Pre-select admin if available
        const targetId = preferredAdminId || initialAdminId;
        if (targetId && data.admins.some((a) => a._id === targetId)) {
          setSelectedAdminId(targetId);
        } else {
          // Select first active admin by default
          const firstActive = data.admins.find((a) => a.status === 'active') || data.admins[0];
          if (firstActive) {
            setSelectedAdminId(firstActive._id);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load partner admins list');
    } finally {
      setFetchingAdmins(false);
    }
  };

  // Safe initialization on modal open ONLY
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setBatchQuantity('');
      setAdminSearch('');

      // Determine initial mode and batch
      if (initialBatchCode) {
        setSelectedBatchCode(initialBatchCode);
        setAssignMode('batch_qty');
      } else if ((selectedLinkIds?.length || 0) === 0 && batches?.length > 0) {
        setAssignMode('batch_qty');
        setSelectedBatchCode(batches[0].batchCode);
      } else {
        setAssignMode((selectedLinkIds?.length || 0) > 0 ? 'selected' : 'batch_qty');
        if (batches?.length > 0) {
          setSelectedBatchCode(batches[0].batchCode);
        }
      }

      // Fetch admins only once on open
      fetchAdmins(initialAdminId);
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialBatchCode, initialAdminId]);

  // Active batch object and inventory metrics
  const activeBatch = useMemo(() => {
    if (!batches || batches.length === 0 || !selectedBatchCode) return null;
    return batches.find((b) => b.batchCode === selectedBatchCode) || null;
  }, [batches, selectedBatchCode]);

  const availableUnassigned = useMemo(() => {
    if (!activeBatch) return 0;
    if (typeof activeBatch.unassignedCount === 'number') {
      return activeBatch.unassignedCount;
    }
    return Math.max(0, (activeBatch.totalCount || 0) - (activeBatch.assignedCount || 0));
  }, [activeBatch]);

  // Selected Admin Object
  const selectedAdmin = useMemo(() => {
    if (!admins || admins.length === 0 || !selectedAdminId) return null;
    return admins.find((a) => a._id === selectedAdminId) || null;
  }, [admins, selectedAdminId]);

  // Filtered Admins for search
  const filteredAdmins = useMemo(() => {
    if (!adminSearch.trim()) return admins;
    const query = adminSearch.toLowerCase().trim();
    return admins.filter(
      (a) =>
        a.name?.toLowerCase().includes(query) ||
        a.email?.toLowerCase().includes(query) ||
        a.phone?.toLowerCase().includes(query) ||
        a.company?.toLowerCase().includes(query)
    );
  }, [admins, adminSearch]);

  if (!isOpen) return null;

  const numQty = parseInt(batchQuantity, 10) || 0;
  const isSelectedMode = assignMode === 'selected';
  const quantityToAssign = isSelectedMode ? selectedLinkIds.length : numQty;

  // Validation
  const isQuantityValid =
    isSelectedMode
      ? selectedLinkIds.length > 0
      : numQty > 0 && numQty <= availableUnassigned;

  const isBlockedAdmin = selectedAdmin?.status === 'blocked';
  const isSubmitDisabled =
    loading ||
    fetchingAdmins ||
    !selectedAdminId ||
    !isQuantityValid ||
    isBlockedAdmin ||
    (!isSelectedMode && availableUnassigned === 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminId) {
      toast.error('Please select a Partner Admin');
      return;
    }

    if (isBlockedAdmin) {
      toast.error('Cannot assign inventory to a blocked partner account');
      return;
    }

    if (isSelectedMode && selectedLinkIds.length === 0) {
      toast.error('No QR links selected for assignment');
      return;
    }

    if (!isSelectedMode) {
      if (numQty <= 0) {
        toast.error('Please enter a quantity greater than 0');
        return;
      }
      if (numQty > availableUnassigned) {
        toast.error(`Quantity cannot exceed available batch stock (${availableUnassigned})`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        adminId: selectedAdminId,
      };

      if (isSelectedMode) {
        payload.linkIds = selectedLinkIds;
      } else {
        payload.batchCode = selectedBatchCode;
        payload.quantity = numQty;
      }

      const { data } = await api.post('/qr/assign', payload);
      if (data.success) {
        toast.success(
          data.message ||
            `Successfully assigned ${quantityToAssign} QRs to ${selectedAdmin?.name || 'partner'}!`
        );
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign links');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">
                Assign QR Inventory
              </h2>
              <p className="text-xs text-slate-500">
                Allocate factory stock or selected codes to partner admins
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Assignment Mode Tabs (Only when selected links exist) */}
          {selectedLinkIds.length > 0 && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setAssignMode('selected')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isSelectedMode
                    ? 'bg-white text-black shadow-xs'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                Selected ({selectedLinkIds.length} QRs)
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('batch_qty')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isSelectedMode
                    ? 'bg-white text-black shadow-xs'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                Quantity from Batch
              </button>
            </div>
          )}

          {/* MODE: DIRECT SELECTED LINKS */}
          {isSelectedMode && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Direct Link Allocation
                </span>
                <span className="px-2 py-0.5 bg-black text-white text-[11px] font-mono font-bold rounded-md">
                  {selectedLinkIds.length} QRs Selected
                </span>
              </div>
              <p className="text-xs text-slate-500">
                The {selectedLinkIds.length} codes you selected from the dashboard table will be
                assigned directly to the partner reseller below.
              </p>
            </div>
          )}

          {/* MODE: QUANTITY FROM BATCH */}
          {!isSelectedMode && (
            <div className="space-y-3.5 p-4 bg-slate-50 rounded-xl border border-slate-200">
              {/* Batch Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Source Batch *
                  </label>
                  {batches.length > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {batches.length} {batches.length === 1 ? 'batch' : 'batches'} available
                    </span>
                  )}
                </div>

                {batches.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No production batches found. Please generate a batch first.</span>
                  </div>
                ) : (
                  <select
                    value={selectedBatchCode}
                    onChange={(e) => {
                      setSelectedBatchCode(e.target.value);
                      setBatchQuantity('');
                    }}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all cursor-pointer font-mono"
                  >
                    {batches.map((b) => {
                      const avail =
                        b.unassignedCount ??
                        Math.max(0, (b.totalCount || 0) - (b.assignedCount || 0));
                      return (
                        <option key={b._id || b.batchCode} value={b.batchCode}>
                          {b.batchCode} — {avail} available ({b.totalCount} total)
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Batch Stock Snapshot */}
              {activeBatch && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Batch Stock Status
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[200px]">
                      {activeBatch.description || activeBatch.batchCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center">
                    <div className="p-1.5 bg-slate-50 rounded-md">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Batch Size</p>
                      <p className="text-xs font-mono font-bold text-black">
                        {activeBatch.totalCount || 0}
                      </p>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-md">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Assigned</p>
                      <p className="text-xs font-mono font-bold text-slate-700">
                        {activeBatch.assignedCount || 0}
                      </p>
                    </div>
                    <div
                      className={`p-1.5 rounded-md ${
                        availableUnassigned > 0
                          ? 'bg-black text-white'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <p className="text-[10px] uppercase font-semibold opacity-80">In Stock</p>
                      <p className="text-xs font-mono font-bold">{availableUnassigned}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Depleted Stock Alert */}
              {activeBatch && availableUnassigned === 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">All QRs Assigned:</strong> All {activeBatch.totalCount}{' '}
                    codes in batch <span className="font-mono font-bold">{selectedBatchCode}</span> have
                    already been assigned. Please choose another batch or generate a new one.
                  </div>
                </div>
              )}

              {/* Quantity Input & Preset Chips */}
              {activeBatch && availableUnassigned > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Quantity to Assign *
                    </label>
                    <span className="text-[11px] text-slate-500">
                      In Stock:{' '}
                      <strong className="text-black font-mono">{availableUnassigned}</strong>
                    </span>
                  </div>

                  <input
                    type="number"
                    min="1"
                    max={availableUnassigned}
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(e.target.value)}
                    placeholder={`Enter count (1 to ${availableUnassigned})`}
                    className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-black font-mono focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />

                  {/* Quantity Presets */}
                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                    {[25, 50, 100, 250, 500].map((qty) => {
                      const isApplicable = qty <= availableUnassigned;
                      if (!isApplicable && availableUnassigned < 25) return null;
                      return (
                        <button
                          key={qty}
                          type="button"
                          disabled={!isApplicable}
                          onClick={() => setBatchQuantity(qty)}
                          className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border transition-all cursor-pointer ${
                            numQty === qty
                              ? 'bg-black text-white border-black shadow-xs'
                              : isApplicable
                              ? 'bg-white text-slate-700 border-slate-200 hover:border-black'
                              : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                          }`}
                        >
                          {qty}
                        </button>
                      );
                    })}

                    {/* All Available Button */}
                    <button
                      type="button"
                      onClick={() => setBatchQuantity(availableUnassigned)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border transition-all ml-auto cursor-pointer ${
                        numQty === availableUnassigned
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-slate-300 hover:border-black'
                      }`}
                      title="Assign all remaining unassigned QRs in this batch"
                    >
                      All ({availableUnassigned})
                    </button>
                  </div>

                  {/* Live Remaining Stock Calculator */}
                  {numQty > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs">
                      {numQty > availableUnassigned ? (
                        <p className="text-red-600 font-semibold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>
                            Quantity exceeds available stock ({availableUnassigned} max).
                          </span>
                        </p>
                      ) : (
                        <p className="text-slate-600 flex items-center justify-between">
                          <span>Remaining in batch after transfer:</span>
                          <span className="font-mono font-bold text-black">
                            {availableUnassigned - numQty} QRs left
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ADMIN / RESELLER SELECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipient Partner Admin *
              </label>
              <button
                type="button"
                onClick={() => fetchAdmins()}
                disabled={fetchingAdmins}
                className="text-[11px] text-slate-400 hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
                title="Refresh partner list"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingAdmins ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>
            </div>

            {fetchingAdmins ? (
              <div className="h-11 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Loading partners...</span>
              </div>
            ) : admins.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No active Admin accounts found. Please add a partner from the "Admins" tab first.
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  required
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all cursor-pointer"
                >
                  <option value="" disabled>
                    -- Choose Partner Reseller --
                  </option>
                  {admins.map((adm) => (
                    <option key={adm._id} value={adm._id}>
                      {adm.name} {adm.company ? `(${adm.company})` : ''} — {adm.assignedCount || 0}{' '}
                      allocated {adm.status === 'blocked' ? '[BLOCKED]' : ''}
                    </option>
                  ))}
                </select>

                {/* Selected Partner Snapshot Card */}
                {selectedAdmin && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center text-xs font-bold">
                          {selectedAdmin.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black">{selectedAdmin.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {selectedAdmin.company || 'Agency Partner'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          selectedAdmin.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {selectedAdmin.status}
                      </span>
                    </div>

                    {isBlockedAdmin ? (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-md text-[11px] text-red-700 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>This partner account is blocked and cannot receive new stock.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-center">
                        <div className="p-1 bg-white rounded border border-slate-100">
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">
                            Current Stock
                          </p>
                          <p className="text-xs font-mono font-bold text-black">
                            {selectedAdmin.assignedCount || 0}
                          </p>
                        </div>
                        <div className="p-1 bg-white rounded border border-slate-100">
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">
                            Activated
                          </p>
                          <p className="text-xs font-mono font-bold text-slate-700">
                            {selectedAdmin.configuredCount || 0}
                          </p>
                        </div>
                        <div className="p-1 bg-white rounded border border-slate-100">
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">
                            Ready to Sell
                          </p>
                          <p className="text-xs font-mono font-bold text-emerald-700">
                            {selectedAdmin.availableCount || 0}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRANSFER IMPACT PREVIEW */}
          {quantityToAssign > 0 && selectedAdmin && !isBlockedAdmin && (
            <div className="p-3.5 bg-black text-white rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-[11px] font-mono tracking-wider opacity-70 uppercase">
                <span>Transfer Preview</span>
                <span>Ready to Execute</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <span className="text-slate-300">Volume to Transfer:</span>
                <span className="font-mono font-bold text-sm text-white">
                  +{quantityToAssign} QR Codes
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Recipient:</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {selectedAdmin.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Partner Total After Transfer:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {(selectedAdmin.assignedCount || 0) + quantityToAssign} QRs
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-black rounded-lg flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Confirm Assignment ({quantityToAssign})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
