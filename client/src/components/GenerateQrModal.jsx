import { useState } from 'react';
import { X, QrCode, Layers, Sparkles, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function GenerateQrModal({ isOpen, onClose, onSuccess }) {
  const [count, setCount] = useState(300);
  const [batchCode, setBatchCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = parseInt(count, 10);
    if (isNaN(num) || num <= 0 || num > 5000) {
      toast.error('Please enter a count between 1 and 5,000');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/qr/generate', {
        count: num,
        batchCode: batchCode ? batchCode.trim().toUpperCase() : undefined,
        description: description.trim(),
      });

      if (data.success) {
        if (data.sampleLink && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(data.sampleLink).catch(() => {});
        }
        toast.success(data.message || `Generated ${num} QR links successfully!`, {
          icon: '📋',
        });
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate QR batch');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomBatchName = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    setBatchCode(`BATCH-${dateStr}-${rand}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-black">Generate QR Links</h2>
              <p className="text-xs text-slate-500">Bulk generation for smart NFC cards</p>
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
          {/* Count Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Number of QRs to Generate *
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              required
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="e.g. 300"
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
            <div className="flex gap-2 mt-2">
              {[50, 100, 300, 500, 1000].map((quick) => (
                <button
                  type="button"
                  key={quick}
                  onClick={() => setCount(quick)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all ${
                    Number(count) === quick
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Batch / Group Code (for record tracking)
              </label>
              <button
                type="button"
                onClick={generateRandomBatchName}
                className="text-[11px] font-bold text-slate-500 hover:text-black flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto Code</span>
              </button>
            </div>
            <input
              type="text"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
              placeholder="e.g. BATCH-2026-NFC-01"
              className="w-full h-11 px-3.5 font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Leave blank to automatically create a date-based batch code.
            </p>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Batch Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Glossy black PVC smart business cards for March expo"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all resize-none"
            />
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
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating {count} QRs...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Generate {count} Links</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
