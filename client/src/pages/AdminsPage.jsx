import { useState, useEffect } from 'react';
import { Plus, Users, Search, RefreshCw, Mail, Phone, Building2, Trash2, Edit2, ShieldAlert, Loader2, X, Lock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      const { data } = await api.get('/admins');
      if (data.success) {
        setAdmins(data.admins || []);
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
        name,
        email,
        phone,
        company,
        password,
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
        toast.success(`Admin status updated to ${newStatus}`);
        fetchAdmins();
      }
    } catch (err) {
      toast.error('Failed to update admin status');
    }
  };

  const handleDeleteAdmin = async (admin) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${admin.name}? Any assigned links will be returned to the unassigned pool.`
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

  const filteredAdmins = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.phone.toLowerCase().includes(search.toLowerCase()) ||
      (a.company && a.company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-black" />
            <span>Admin & Reseller Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create reseller admins, monitor their card allocations, and control account status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchAdmins}
            className="p-2.5 bg-white border border-slate-300 hover:border-black rounded-lg text-slate-700 transition-colors shadow-2xs"
            title="Refresh admins"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial h-10 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Admin</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search admins by name, email, phone, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-black placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4 font-bold">Admin Details</th>
                <th className="py-3 px-4 font-bold">Company / Agency</th>
                <th className="py-3 px-4 font-bold text-center">Assigned QRs</th>
                <th className="py-3 px-4 font-bold text-center">Configured (Sold)</th>
                <th className="py-3 px-4 font-bold text-center">Available</th>
                <th className="py-3 px-4 font-bold text-center">Total Scans</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-black mb-2"></div>
                    <p className="text-xs font-medium">Loading admins...</p>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-black">No Admins Found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click "Add New Admin" to register a reseller or agency partner.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {admin.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-black">{admin.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {admin.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {admin.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {admin.company ? (
                        <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {admin.company}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Direct Partner</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-md text-black">
                        {admin.assignedCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md">
                        {admin.configuredCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md">
                        {admin.availableCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs text-slate-700">
                        {admin.totalScans || 0}
                      </span>
                    </td>

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

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
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
                <h2 className="text-base font-bold text-black">Create Admin Account</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors"
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
                  placeholder="e.g. Michael Vance"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
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
                  placeholder="e.g. michael@agency.com"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
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
                  placeholder="e.g. +1-555-0211"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
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
                  placeholder="e.g. Smart NFC Solutions LLC"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
