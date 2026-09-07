import { useState, useEffect } from 'react';
import { X, UserCheck, Users, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AssignModal({
  isOpen,
  onClose,
  selectedLinkIds = [],
  batches = [],
  initialBatchCode = '',
  onSuccess,
}) {
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assignMode, setAssignMode] = useState('selected'); // 'selected' | 'batch_qty'
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [batchQuantity, setBatchQuantity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingAdmins, setFetchingAdmins] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBatchQuantity(0);
      fetchAdmins();
      if (initialBatchCode) {
        setSelectedBatchCode(initialBatchCode);
        setAssignMode('batch_qty');
      } else if (selectedLinkIds.length === 0 && batches.length > 0) {
        setAssignMode('batch_qty');
        setSelectedBatchCode(batches[0].batchCode);
      } else {
        setAssignMode('selected');
        if (batches.length > 0) setSelectedBatchCode(batches[0].batchCode);
      }
    }
  }, [isOpen, selectedLinkIds, batches, initialBatchCode]);

  const fetchAdmins = async () => {
    setFetchingAdmins(true);
    try {
      const { data } = await api.get('/admins');
      if (data.success && data.admins) {
        setAdmins(data.admins);
        if (data.admins.length > 0) {
          setSelectedAdminId(data.admins[0]._id);
        }
      }
    } catch (err) {
      toast.error('Failed to load admins list');
    } finally {
      setFetchingAdmins(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminId) {
      toast.error('Please select an Admin');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        adminId: selectedAdminId,
      };

      if (assignMode === 'selected') {
        payload.linkIds = selectedLinkIds;
      } else {
        const qty = parseInt(batchQuantity, 10);
        if (isNaN(qty) || qty <= 0) {
          toast.error('Please enter a quantity greater than 0');
          setLoading(false);
          return;
        }
        payload.batchCode = selectedBatchCode;
        payload.quantity = qty;
      }

      const { data } = await api.post('/qr/assign', payload);
      if (data.success) {
        toast.success(data.message || 'Links assigned successfully!');
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign links');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-black">Assign QR Links to Admin</h2>
              <p className="text-xs text-slate-500">Allocate inventory to resellers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Assignment Mode Tabs */}
          {selectedLinkIds.length > 0 && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setAssignMode('selected')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  assignMode === 'selected'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                Selected ({selectedLinkIds.length} QRs)
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('batch_qty')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  assignMode === 'batch_qty'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-slate-500 hover:text-black'
                }`}
              >
                Quantity from Batch
              </button>
            </div>
          )}

          {/* Batch Quantity Selection (if mode is batch_qty) */}
          {assignMode === 'batch_qty' && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Source Batch *
                </label>
                <select
                  value={selectedBatchCode}
                  onChange={(e) => setSelectedBatchCode(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black"
                >
                  {batches.map((b) => (
                    <option key={b._id} value={b.batchCode}>
                      {b.batchCode} ({b.unassignedCount ?? b.totalCount} unassigned available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Quantity to Assign *
                  </label>
                  {(() => {
                    const activeBatch = batches.find((b) => b.batchCode === selectedBatchCode);
                    const avail = activeBatch ? (activeBatch.unassignedCount ?? activeBatch.totalCount) : null;
                    return avail !== null ? (
                      <span className="text-[11px] text-slate-500">
                        Available: <strong className="text-black font-mono">{avail}</strong>
                      </span>
                    ) : null;
                  })()}
                </div>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black mb-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                />

                {/* Quick Quantity Presets (e.g. 50, 100, 250, 500, 1000) */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {[50, 100, 250, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setBatchQuantity(qty)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                        Number(batchQuantity) === qty
                          ? 'bg-black text-white border-black shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-black'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                  {(() => {
                    const activeBatch = batches.find((b) => b.batchCode === selectedBatchCode);
                    const avail = activeBatch ? (activeBatch.unassignedCount ?? activeBatch.totalCount) : 0;
                    return avail > 0 ? (
                      <button
                        type="button"
                        onClick={() => setBatchQuantity(avail)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md border border-slate-200 bg-white text-slate-700 hover:border-black transition-all ml-auto cursor-pointer"
                        title="Assign all available unassigned links in this batch"
                      >
                        All ({avail})
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Admin Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Admin / Reseller *
            </label>
            {fetchingAdmins ? (
              <div className="text-xs text-slate-400 py-3 text-center">Loading admins...</div>
            ) : admins.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No active Admin accounts found. Please add an admin from the "Admins" tab first.
              </div>
            ) : (
              <select
                required
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
              >
                {admins.map((adm) => (
                  <option key={adm._id} value={adm._id}>
                    {adm.name} ({adm.phone || adm.email}) - Current: {adm.assignedCount} links
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || admins.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>
                    Confirm Assignment (
                    {assignMode === 'selected' ? selectedLinkIds.length : batchQuantity})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
