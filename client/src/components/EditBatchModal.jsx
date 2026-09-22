import { useState, useEffect } from 'react';
import { X, Layers, Save, Loader2, AlertCircle, FileText, Tag, Info, Sparkles } from 'lucide-react';
import { updateBatch } from '../services/api';
import toast from 'react-hot-toast';

export default function EditBatchModal({ isOpen, onClose, batch, onSuccess }) {
  const [batchCode, setBatchCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (batch) {
      setBatchCode(batch.batchCode || '');
      setDescription(batch.description || '');
    }
  }, [batch]);

  if (!isOpen || !batch) return null;

  const initialBatchCode = batch.batchCode;
  const isCodeChanged = batchCode.trim().toUpperCase() !== initialBatchCode.toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCode = batchCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Batch code cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        batchCode: cleanCode,
        description: description.trim(),
      };

      const data = await updateBatch(initialBatchCode, payload);
      if (data.success) {
        toast.success(data.message || 'Batch updated successfully');
        if (onSuccess) {
          onSuccess(data.batch || { batchCode: cleanCode, description });
        }
        onClose();
      } else {
        toast.error(data.message || 'Failed to update batch');
      }
    } catch (err) {
      console.error('Batch update error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update batch');
    } finally {
      setSubmitting(false);
    }
  };

  const generateRandomBatchName = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    setBatchCode(`BATCH-${dateStr}-${rand}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">Edit Production Batch</h2>
              <p className="text-xs text-slate-500 font-mono">
                Current Code: <span className="font-bold text-black">{initialBatchCode}</span>
              </p>
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Batch Overview KPI pill */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total QRs</span>
              <span className="font-mono font-black text-black text-sm">
                {batch.totalCount?.toLocaleString() || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned</span>
              <span className="font-mono font-black text-slate-700 text-sm">
                {batch.assignedCount?.toLocaleString() || 0}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Active</span>
              <span className="font-mono font-black text-black text-sm">
                {batch.configuredCount?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Batch Code Field */}
          <div>
            <div className='flex justify-between'>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>Batch Code *</span>
            </label>
            <button
                type="button"
                onClick={generateRandomBatchName}
                className="text-[11px] font-bold text-slate-500 hover:text-black flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto Code</span>
              </button>
              </div>
            <input
              type="text"
              required
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
              placeholder="e.g. BATCH-20260904-ABCD"
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-black uppercase focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
            {isCodeChanged && (
              <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2 text-amber-800 text-xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Renaming this batch will automatically update the batch reference on all{' '}
                  <strong className="font-mono">{batch.totalCount || 0}</strong> associated QR codes.
                </p>
              </div>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Description / Production Notes</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Acrylic Standees Lot #4 - Delhi NCR Resellers"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
