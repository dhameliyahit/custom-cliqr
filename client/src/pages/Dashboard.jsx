import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, QrCode, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { downloadExportFile } from '../services/api';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import DataTable from '../components/DataTable';
import GenerateQrModal from '../components/GenerateQrModal';
import AssignModal from '../components/AssignModal';
import ConfigureLinkModal from '../components/ConfigureLinkModal';
import QrPreviewModal from '../components/QrPreviewModal';
import QuickActivateModal from '../components/QuickActivateModal';
import QrScanModal from '../components/QrScanModal';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const urlBatchCode = searchParams.get('batchCode') || '';
  const urlAdminId = searchParams.get('adminId') || '';

  // State
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Activator Modal state
  const [isQuickActivateOpen, setIsQuickActivateOpen] = useState(false);
  const [quickActivateLink, setQuickActivateLink] = useState(null);

  // Filters matching user wireframe
  const [filters, setFilters] = useState({
    period: urlBatchCode || urlAdminId ? 'all' : 'this_month',
    adminId: urlAdminId || 'all',
    batchCode: urlBatchCode || 'all',
    status: 'all',
    search: '',
  });

  // Sync from URL search parameters on route navigation
  useEffect(() => {
    const qBatch = searchParams.get('batchCode');
    const qAdmin = searchParams.get('adminId');
    if (qBatch || qAdmin) {
      setFilters((prev) => ({
        ...prev,
        period: 'all',
        batchCode: qBatch || prev.batchCode || 'all',
        adminId: qAdmin || prev.adminId || 'all',
      }));
    }
  }, [searchParams]);

  // Pagination matching user wireframe (Prev [1] [2] [3] Next)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [configureLink, setConfigureLink] = useState(null);
  const [previewLink, setPreviewLink] = useState(null);

  // Fetch Links with active filters & pagination
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        period: filters.period,
        adminId: filters.adminId,
        batchCode: filters.batchCode !== 'all' ? filters.batchCode : undefined,
        status: filters.status,
        search: filters.search,
      };

      const { data } = await api.get('/qr', { params });
      if (data.success) {
        setLinks(data.links || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        }));
      }
    } catch (err) {
      toast.error('Failed to load QR links');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const { data } = await api.get('/qr/stats');
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  // Fetch Admins list for filter dropdown
  const fetchAdmins = async () => {
    if (!isSuperAdmin) return;
    try {
      const { data } = await api.get('/admins');
      if (data.success) {
        setAdmins(data.admins || []);
      }
    } catch (err) {
      console.error('Admins fetch error:', err);
    }
  };

  // Fetch Batches
  const fetchBatches = async () => {
    try {
      const { data } = await api.get('/qr/batches');
      if (data.success) {
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error('Batches fetch error:', err);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchBatches();
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  // Refetch links on filter or page change
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Filter change handler
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedIds([]);
  };

  // Multi-select handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === links.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(links.map((l) => l._id));
    }
  };

  // [TEMP/CONFIGURABLE] Delete Selected QR Links
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${selectedIds.length} selected QR link(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const { data } = await api.post('/qr/delete-bulk', { linkIds: selectedIds });
      if (data.success) {
        toast.success(data.message || `Deleted ${selectedIds.length} QR links`);
        setSelectedIds([]);
        fetchLinks();
        fetchStats();
        fetchBatches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete selected QR links');
    }
  };

  // [TEMP/CONFIGURABLE] Delete Single QR Link
  const handleDeleteSingle = async (link) => {
    if (!window.confirm(`Are you sure you want to permanently delete QR link ${link.code}?`)) {
      return;
    }

    try {
      const { data } = await api.delete(`/qr/${link._id}`);
      if (data.success) {
        toast.success(`QR link ${link.code} deleted`);
        setSelectedIds((prev) => prev.filter((id) => id !== link._id));
        fetchLinks();
        fetchStats();
        fetchBatches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete QR link');
    }
  };

  // Fast Selection by Quantity (e.g. 50, 100, 500)
  const handleSelectByQuantity = async (count) => {
    try {
      toast.loading(`Selecting ${count} unassigned QR links...`, { id: 'select-qty' });
      const { data } = await api.get('/qr/unassigned-ids', {
        params: { limit: count },
      });
      if (data.success && data.linkIds) {
        setSelectedIds(data.linkIds);
        toast.success(`Selected ${data.linkIds.length} unassigned QR link(s)!`, { id: 'select-qty' });
      }
    } catch (err) {
      toast.error('Failed to select links by quantity', { id: 'select-qty' });
    }
  };

  // Export CSV / XLSX / ZIP (Authenticated via Axios Blob)
  const handleExport = async (format = 'xlsx', customIds = null) => {
    try {
      const isZip = format === 'zip';
      toast.loading(
        isZip ? 'Generating print-ready SVGs ZIP archive...' : `Preparing ${format.toUpperCase()} export...`,
        { id: 'export-toast' }
      );

      const targetIds = customIds || (selectedIds.length > 0 ? selectedIds : []);
      await downloadExportFile({
        format,
        adminId: filters.adminId,
        status: filters.status,
        ids: targetIds,
      });

      toast.success(
        isZip ? 'Print-ready SVGs ZIP archive downloaded!' : `${format.toUpperCase()} exported successfully!`,
        { id: 'export-toast' }
      );
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err.response?.data?.message || 'Failed to download export file', {
        id: 'export-toast',
      });
    }
  };

  // Refresh all
  const handleRefresh = () => {
    fetchLinks();
    fetchStats();
    fetchBatches();
    if (isSuperAdmin) fetchAdmins();
    toast.success('Data refreshed');
  };

  const handleOpenQuickActivate = (link = null) => {
    setQuickActivateLink(link);
    setIsQuickActivateOpen(true);
  };

  const handleApplyScanSearch = (code, matchedLink) => {
    setFilters((prev) => ({
      ...prev,
      period: 'all',
      adminId: 'all',
      status: 'all',
      search: code,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
    toast.success(`Search filter applied: ${code}`);
  };

  // Quick status toggle (Active vs Paused)
  const handleToggleStatus = async (link) => {
    if (!link.redirectUrl || (link.status !== 'configured' && link.status !== 'inactive')) {
      toast.error('Configure destination link first before activating or pausing');
      return;
    }

    const newStatus = link.status === 'configured' ? 'inactive' : 'configured';

    // Optimistic update
    setLinks((prev) =>
      prev.map((l) => (l._id === link._id ? { ...l, status: newStatus } : l))
    );

    try {
      const { data } = await api.put(`/qr/${link._id}/configure`, {
        status: newStatus,
      });

      if (data.success) {
        toast.success(
          newStatus === 'configured'
            ? `QR ${link.code} is now Live & Active!`
            : `QR ${link.code} is Paused.`,
          { id: `status-toast-${link._id}` }
        );
        fetchStats();
      }
    } catch (err) {
      // Revert on error
      setLinks((prev) =>
        prev.map((l) => (l._id === link._id ? { ...l, status: link.status } : l))
      );
      toast.error(err.response?.data?.message || 'Failed to update QR status');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            {isSuperAdmin ? (
              <>
                <QrCode className="w-6 h-6 text-black" />
                <span>QR Gen & Link Allocator</span>
              </>
            ) : (
              <>
                <QrCode className="w-6 h-6 text-black" />
                <span>My QR Codes</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? 'Bulk generate QR batches, assign links to admins, and monitor scan redirects.'
              : 'Activate QR codes for business clients and configure redirection links on the spot.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-white border border-slate-300 hover:border-black rounded-lg text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsScanModalOpen(true)}
            className="h-10 px-3 bg-white border border-slate-300 hover:border-black rounded-lg text-black transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Scan QR Code or Upload Image to Search"
          >
            <QrCode className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold">Scan QR</span>
          </button>

          {isSuperAdmin ? (
            <button
              onClick={() => setIsGenerateOpen(true)}
              className="flex-1 sm:flex-initial h-10 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate QRs</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenQuickActivate()}
              className="flex-1 sm:flex-initial h-10 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Active QR</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <StatsCards stats={stats} />

      {/* Filter Bar matching wireframe: This Month Generate, Admin wise Filter, Search */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        admins={admins}
        batches={batches}
        selectedCount={selectedIds.length}
        onOpenAssignModal={() => setIsAssignOpen(true)}
        onDeleteSelected={handleDeleteSelected}
        onSelectByQuantity={handleSelectByQuantity}
        onExport={handleExport}
        onClearSelection={() => setSelectedIds([])}
        onOpenScanModal={() => setIsScanModalOpen(true)}
      />

      {/* Main Data Table */}
      <DataTable
        links={links}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onRowsChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onConfigureLink={(link) => setConfigureLink(link)}
        onPreviewQr={(link) => setPreviewLink(link)}
        onDeleteLink={handleDeleteSingle}
        onQuickActivate={handleOpenQuickActivate}
        onToggleStatus={handleToggleStatus}
      />

      {/* Mobile Floating Action Button (FAB) for Reseller Admin */}
      {!isSuperAdmin && (
        <button
          type="button"
          onClick={() => handleOpenQuickActivate()}
          className="sm:hidden fixed bottom-5 right-5 z-40 h-13 px-4 bg-black hover:bg-zinc-900 text-white rounded-full shadow-2xl flex items-center gap-2 border border-amber-400/80 transition-all active:scale-95 cursor-pointer"
          title="Active QR"
        >
          <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider uppercase">Active QR</span>
        </button>
      )}

      {/* Modals */}
      <QuickActivateModal
        isOpen={isQuickActivateOpen}
        onClose={() => {
          setIsQuickActivateOpen(false);
          setQuickActivateLink(null);
        }}
        initialLink={quickActivateLink}
        availableLinks={links}
        onSuccess={() => {
          fetchLinks();
          fetchStats();
        }}
        onPreviewQr={(link) => setPreviewLink(link)}
      />

      <GenerateQrModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        admins={admins}
        onSuccess={(data, assignedAdminId) => {
          // Reset to page 1 so new links are visible
          setPagination((prev) => ({ ...prev, page: 1 }));
          // If admin was pre-assigned, filter to show that admin's links
          if (assignedAdminId) {
            setFilters((prev) => ({
              ...prev,
              period: 'all',
              adminId: assignedAdminId,
              status: 'all',
              batchCode: data?.batch?.batchCode || prev.batchCode,
            }));
          } else {
            setFilters((prev) => ({
              ...prev,
              period: 'all',
              status: 'all',
              batchCode: data?.batch?.batchCode || prev.batchCode,
            }));
          }
          fetchStats();
          fetchBatches();
          if (isSuperAdmin) fetchAdmins();
        }}
      />

      <AssignModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        selectedLinkIds={selectedIds}
        batches={batches}
        onSuccess={() => {
          setSelectedIds([]);
          fetchLinks();
          fetchStats();
          fetchBatches();
          if (isSuperAdmin) fetchAdmins();
        }}
      />

      <ConfigureLinkModal
        isOpen={!!configureLink}
        onClose={() => setConfigureLink(null)}
        link={configureLink}
        onSuccess={() => {
          fetchLinks();
          fetchStats();
        }}
      />

      <QrPreviewModal
        isOpen={!!previewLink}
        onClose={() => setPreviewLink(null)}
        link={previewLink}
      />

      <QrScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApplySearch={handleApplyScanSearch}
        onConfigureLink={(link) => setConfigureLink(link)}
        onQuickActivate={(link) => handleOpenQuickActivate(link)}
      />
    </div>
  );
}
