import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Trash2,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  X,
  Lock,
  Eye,
  CheckCircle2,
  Package,
  Activity,
  Filter,
  ArrowUpDown,
  RotateCcw,
  ExternalLink,
  UserCheck,
  TrendingUp,
  QrCode,
} from 'lucide-react';
import api from '../services/api';
import AdminDetailsModal from '../components/AdminDetailsModal';
import EditAdminModal from '../components/EditAdminModal';
import AssignModal from '../components/AssignModal';
import toast from 'react-hot-toast';

export default function AdminsPage() {
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [batches, setBatches] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | blocked
  const [inventoryFilter, setInventoryFilter] = useState('all'); // all | has_inventory | active_sellers | low_stock | no_inventory
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | name_asc | assigned_desc | configured_desc | rate_desc | scans_desc

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inspectAdminId, setInspectAdminId] = useState(null);
  const [editAdmin, setEditAdmin] = useState(null);
  const [assignAdmin, setAssignAdmin] = useState(null);

  // New Admin Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const [adminsRes, batchesRes] = await Promise.all([
        api.get('/admins'),
        api.get('/qr/batches').catch(() => ({ data: { batches: [] } })),
      ]);

      if (adminsRes.data.success) {
        setAdmins(adminsRes.data.admins || []);
        if (adminsRes.data.kpis) {
          setKpis(adminsRes.data.kpis);
        } else {
          // Client-side KPI calculation fallback
          let alloc = 0;
          let cfg = 0;
          let avail = 0;
          let scn = 0;
          let act = 0;
          let blk = 0;
          (adminsRes.data.admins || []).forEach((a) => {
            alloc += a.assignedCount || 0;
            cfg += a.configuredCount || 0;
            avail += a.availableCount || 0;
            scn += a.totalScans || 0;
            if (a.status === 'active') act++;
            else blk++;
          });
          setKpis({
            totalAdmins: (adminsRes.data.admins || []).length,
            activeAdmins: act,
            blockedAdmins: blk,
            totalAllocated: alloc,
            totalConfigured: cfg,
            totalAvailable: avail,
            totalScans: scn,
            avgSellThroughRate: alloc > 0 ? ((cfg / alloc) * 100).toFixed(1) : 0,
          });
        }
      }

      if (batchesRes.data?.success) {
        setBatches(batchesRes.data.batches || []);
      }
    } catch (err) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/admins', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        company: company.trim(),
        password: password.trim(),
      });
      if (data.success) {
        toast.success(data.message || 'Admin created successfully!');
        setIsAddModalOpen(false);
        setName('');
        setEmail('');
        setPhone('');
        setCompany('');
        setPassword('');
        fetchAdmins();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === 'active' ? 'blocked' : 'active';
    try {
      const { data } = await api.put(`/admins/${admin._id}`, { status: newStatus });
      if (data.success) {
        toast.success(`Admin account status updated to ${newStatus}`);
        fetchAdmins();
      }
    } catch (err) {
      toast.error('Failed to update admin status');
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${admin.name}? Any assigned links (${admin.assignedCount || 0}) will be safely returned to the central unassigned pool.`
      )
    ) {
      return;
    }

    try {
      const { data } = await api.delete(`/admins/${admin._id}`);
      if (data.success) {
        toast.success(data.message || 'Admin deleted');
        fetchAdmins();
      }
    } catch (err) {
      toast.error('Failed to delete admin');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setInventoryFilter('all');
    setSortBy('newest');
  };

  // Filtered & Sorted Admins
  const filteredAdmins = useMemo(() => {
    let result = [...admins];

    // 1. Text Search (Name, Email, Phone, Company)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.phone && a.phone.toLowerCase().includes(q)) ||
          (a.company && a.company.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (statusFilter === 'active') {
      result = result.filter((a) => a.status === 'active');
    } else if (statusFilter === 'blocked') {
      result = result.filter((a) => a.status === 'blocked');
    }

    // 3. Inventory / Sales Filter
    if (inventoryFilter === 'has_inventory') {
      result = result.filter((a) => (a.assignedCount || 0) > 0);
    } else if (inventoryFilter === 'active_sellers') {
      result = result.filter((a) => (a.configuredCount || 0) > 0);
    } else if (inventoryFilter === 'low_stock') {
      result = result.filter((a) => (a.assignedCount || 0) > 0 && (a.availableCount || 0) <= 5);
    } else if (inventoryFilter === 'no_inventory') {
      result = result.filter((a) => (a.assignedCount || 0) === 0);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'assigned_desc') return (b.assignedCount || 0) - (a.assignedCount || 0);
      if (sortBy === 'configured_desc') return (b.configuredCount || 0) - (a.configuredCount || 0);
      if (sortBy === 'rate_desc') return (b.sellThroughRate || 0) - (a.sellThroughRate || 0);
      if (sortBy === 'scans_desc') return (b.totalScans || 0) - (a.totalScans || 0);
      return 0;
    });

    return result;
  }, [admins, search, statusFilter, inventoryFilter, sortBy]);

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || inventoryFilter !== 'all' || sortBy !== 'newest';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-black" />
            <span>Reseller Admins & Partner Network Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage partner accounts, inspect QR inventory distribution, track end-client sales conversions, and review customer scan activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchAdmins}
            className="p-2.5 bg-white border border-slate-300 hover:border-black rounded-lg text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh admins"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial h-10 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Partner</span>
          </button>
        </div>
      </div>

      {/* Complete Analytics KPI Bar */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* KPI 1: Total Admins */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Admins
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalAdmins?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">Registered resellers</span>
          </div>

          {/* KPI 2: Active Accounts */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Admins
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.activeAdmins?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">
              {kpis.blockedAdmins > 0 ? `${kpis.blockedAdmins} blocked` : 'All active'}
            </span>
          </div>

          {/* KPI 3: Total Allocated */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Assigned QRs
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalAllocated?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">Given to admins</span>
          </div>

          {/* KPI 4: Configured (Sold) */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active QRs
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalConfigured?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">
              {kpis.avgSellThroughRate}% activated
            </span>
          </div>

          {/* KPI 5: Available Partner Stock */}
          <div className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Ready to Sell
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-black">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-black tracking-tight">
              {kpis.totalAvailable?.toLocaleString() || 0}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">In admin inventory</span>
          </div>

          {/* KPI 6: Total Network Scans */}
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
              placeholder="Search by Name, Email, Phone, Company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base input-search"
            />
          </div>

          {/* Dropdown Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Account Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-base"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>

            {/* Inventory / Sales Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <select
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
                className="select-base"
              >
                <option value="all">All Inventory States</option>
                <option value="has_inventory">Has QRs to Sell (&gt; 0)</option>
                <option value="active_sellers">Has Active Clients (&gt; 0)</option>
                <option value="low_stock">Low Stock (≤ 5 Remaining)</option>
                <option value="no_inventory">No QRs Assigned (0)</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-base"
              >
                <option value="newest">Sort: Newest Added</option>
                <option value="oldest">Sort: Oldest Added</option>
                <option value="name_asc">Sort: Name (A-Z)</option>
                <option value="assigned_desc">Sort: Most QRs Assigned</option>
                <option value="configured_desc">Sort: Most QRs Activated</option>
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
            Showing <strong className="text-black font-mono">{filteredAdmins.length}</strong> of{' '}
            <strong className="text-black font-mono">{admins.length}</strong> admins
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Filters Active
            </span>
          )}
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[320px]">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4 font-bold">Admin Details</th>
                <th className="py-3 px-4 font-bold">Company</th>
                <th className="py-3 px-4 font-bold text-center">Assigned QRs</th>
                <th className="py-3 px-4 font-bold">Activation Progress</th>
                <th className="py-3 px-4 font-bold text-center">Active QRs</th>
                <th className="py-3 px-4 font-bold text-center">Ready to Sell</th>
                <th className="py-3 px-4 font-bold text-center">Total Scans</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-black mb-2"></div>
                    <p className="text-xs font-medium">Loading admin records...</p>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-black">No Admins Match Filters</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">
                      Try adjusting your search criteria or add a new admin.
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
                filteredAdmins.map((admin) => {
                  const aTotal = admin.assignedCount || 1;
                  const cfgPct = Math.min(100, Math.round(((admin.configuredCount || 0) / aTotal) * 100));

                  return (
                    <tr key={admin._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Admin Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {admin.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-black">{admin.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {admin.email}
                              </span>
                              {admin.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {admin.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company / Agency */}
                      <td className="py-3.5 px-4">
                        {admin.company ? (
                          <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {admin.company}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Direct Partner</span>
                        )}
                      </td>

                      {/* Total Allocated */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-black">
                          {admin.assignedCount?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Visual Sales Progress Bar */}
                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                            {cfgPct > 0 && (
                              <div
                                style={{ width: `${cfgPct}%` }}
                                className="h-full bg-black"
                                title={`Active: ${admin.configuredCount} (${cfgPct}%)`}
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span className="font-bold text-black">{cfgPct}% active</span>
                            <span>{admin.configuredCount || 0} of {admin.assignedCount || 0}</span>
                          </div>
                        </div>
                      </td>

                      {/* Configured Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-black">
                          {admin.configuredCount?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Ready to Sell */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-black">
                          {admin.availableCount?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Total Scans */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs text-slate-700">
                          {admin.totalScans?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            admin.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                          }`}
                          title="Click to toggle active/blocked status"
                        >
                          {admin.status === 'active' ? 'Active' : 'Blocked'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Partner Performance */}
                          <button
                            onClick={() => setInspectAdminId(admin._id)}
                            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="Inspect partner performance & batch breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Partner Profile */}
                          <button
                            onClick={() => setEditAdmin(admin)}
                            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="Edit partner profile details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Quick Assign Inventory */}
                          <button
                            onClick={() => setAssignAdmin(admin)}
                            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="Allocate QR inventory to this partner"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          {/* View QRs in Dashboard */}
                          <button
                            onClick={() => navigate(`/?adminId=${admin._id}`)}
                            className="p-1.5 text-slate-700 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                            title="View all QRs assigned to this partner on Dashboard"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Delete Partner */}
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Admin"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-black">Create Partner Account</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Agency (Optional)
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Apex Hospitality Standees"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Partner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Admin Details Modal */}
      <AdminDetailsModal
        isOpen={!!inspectAdminId}
        onClose={() => setInspectAdminId(null)}
        adminId={inspectAdminId}
        onAssign={(a) => {
          setInspectAdminId(null);
          setAssignAdmin(a);
        }}
        onEdit={(a) => {
          setInspectAdminId(null);
          setEditAdmin(a);
        }}
        onToggleStatus={handleToggleStatus}
      />

      {/* Edit Admin Modal */}
      <EditAdminModal
        isOpen={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        admin={editAdmin}
        onSuccess={fetchAdmins}
      />

      {/* Assign Inventory Modal */}
      <AssignModal
        isOpen={!!assignAdmin}
        onClose={() => setAssignAdmin(null)}
        batches={batches}
        initialBatchCode=""
        initialAdminId={assignAdmin?._id || ''}
        onSuccess={fetchAdmins}
      />
    </div>
  );
}
