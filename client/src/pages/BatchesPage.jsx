import { useState, useEffect } from 'react';
import { Layers, Download, RefreshCw, Plus, UserCheck, Calendar, Search, Sparkles, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { downloadExportFile } from '../services/api';
import AssignModal from '../components/AssignModal';
import GenerateQrModal from '../components/GenerateQrModal';
import toast from 'react-hot-toast';

export default function BatchesPage() {
  const { isSuperAdmin } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignBatch, setAssignBatch] = useState(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/qr/batches');
      if (data.success) {
        setBatches(data.batches || []);
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

  const filteredBatches = batches.filter(
    (b) =>
      b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-black" />
            <span>QR Batch Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track QR batches, inspect inventory ratios, and export spreadsheets or high-res images.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchBatches}
            className="p-2.5 bg-white border border-slate-300 hover:border-black rounded-lg text-slate-700 transition-colors shadow-2xs"
            title="Refresh batches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsGenerateOpen(true)}
              className="flex-1 sm:flex-initial h-10 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Batch Code (e.g. BATCH-2026-QR)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4 font-bold">Batch / Group Code</th>
                <th className="py-3 px-4 font-bold">Description / Notes</th>
                <th className="py-3 px-4 font-bold text-center">Total Links</th>
                <th className="py-3 px-4 font-bold text-center">Assigned</th>
                <th className="py-3 px-4 font-bold text-center">Unassigned Pool</th>
                <th className="py-3 px-4 font-bold text-center">Configured (Active)</th>
                <th className="py-3 px-4 font-bold text-center">Total Scans</th>
                <th className="py-3 px-4 font-bold text-center">Created Date</th>
                <th className="py-3 px-4 font-bold text-right">Actions / Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-black mb-2"></div>
                    <p className="text-xs font-medium">Loading batches...</p>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-black">No Batches Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Generate QRs to create your first trackable production batch.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-xs sm:text-sm text-black bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {batch.batchCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-[220px] truncate">
                      {batch.description || <span className="text-slate-400 italic">No notes</span>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-black text-sm text-black">
                        {batch.totalCount}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-800">
                        {batch.assignedCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md">
                        {batch.unassignedCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md">
                        {batch.configuredCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs text-slate-700">
                        {batch.totalScans || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center text-xs text-slate-500 font-medium">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Assign */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => setAssignBatch(batch)}
                            className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                            title="Assign links from this batch to Admin"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}

                        {/* Export CSV */}
                        <button
                          onClick={() => handleExportBatch(batch.batchCode, 'csv')}
                          className="h-8 px-2.5 bg-black text-white hover:bg-zinc-800 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title="Export CSV spreadsheet"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>CSV</span>
                        </button>

                        {/* Export XLSX */}
                        <button
                          onClick={() => handleExportBatch(batch.batchCode, 'xlsx')}
                          className="h-8 px-2.5 bg-white text-black border border-slate-300 hover:border-black rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title="Export Excel spreadsheet"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Excel</span>
                        </button>

                        {/* Export High-Res Vector SVGs (ZIP) */}
                        <button
                          onClick={() => handleExportBatch(batch.batchCode, 'zip')}
                          className="h-8 px-2.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          title="Download all print-ready vector SVGs (with centered codes) & manifest in a ZIP archive"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                          <span>ZIP (SVGs)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
