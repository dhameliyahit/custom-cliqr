import { useState } from 'react';
import { X, Trash2, AlertTriangle, Loader2, Layers, AlertCircle } from 'lucide-react';
import { deleteBatch } from '../services/api';
import toast from 'react-hot-toast';

export default function DeleteBatchModal({ isOpen, onClose, batch, onSuccess }) {
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !batch) return null;

  const batchCode = batch.batchCode;
  const isMatch = confirmInput.trim().toUpperCase() === batchCode.toUpperCase();

  const handleDelete = async () => {
    if (!isMatch) {
      toast.error('Please enter the exact Batch Code to confirm deletion');
      return;
    }

    setDeleting(true);
    try {
      const data = await deleteBatch(batchCode);
      if (data.success) {
        toast.success(data.message || `Batch ${batchCode} deleted successfully`);
        if (onSuccess) {
          onSuccess(batchCode);
        }
        onClose();
      } else {
        toast.error(data.message || 'Failed to delete batch');
      }
    } catch (err) {
      console.error('Delete batch error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete batch');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-rose-950">Delete Production Batch</h2>
              <p className="text-xs text-rose-700 font-mono font-bold">{batchCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Warning: This action is permanent and irreversible!</span>
            </div>
            <p className="leading-relaxed">
              Deleting this batch will permanently remove the batch record and all{' '}
              <strong className="font-mono font-bold">{batch.totalCount || 0}</strong> associated QR codes from the database. Any printed standees or active links will stop working immediately.
            </p>
          </div>

          {/* Impact Stats */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total QRs</span>
              <span className="font-mono font-black text-rose-600 text-sm">
                {batch.totalCount?.toLocaleString() || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Links</span>
              <span className="font-mono font-black text-rose-600 text-sm">
                {batch.configuredCount?.toLocaleString() || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Scans</span>
              <span className="font-mono font-black text-slate-700 text-sm">
                {batch.totalScans?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Verification input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              To confirm deletion, type <strong className="font-mono text-black">{batchCode}</strong> below:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={batchCode}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-black focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isMatch || deleting}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Batch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
