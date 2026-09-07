import { useState } from 'react';
import {
  ExternalLink,
  Edit,
  QrCode,
  Copy,
  Check,
  Globe,
  Phone,
  User as UserIcon,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function DataTable({
  links = [],
  loading = false,
  pagination = { page: 1, totalPages: 1, total: 0 },
  onPageChange,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onConfigureLink,
  onPreviewQr,
  onDeleteLink,
  onQuickActivate,
  onToggleStatus,
}) {
  const { isSuperAdmin } = useAuth();
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (text, code) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    toast.success(`Copied: ${text}`, { duration: 1500 });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isAllSelected = links.length > 0 && selectedIds.length === links.length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'configured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active / Linked</span>
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>Assigned</span>
          </span>
        );
      case 'unassigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Unassigned</span>
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Paused</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Table desktop/tablet container */}
      <div className="hidden md:block overflow-x-auto min-h-[380px]">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold select-none">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded-sm border-slate-300 text-black focus:ring-black cursor-pointer accent-black"
                />
              </th>
              <th className="py-3 px-4 font-bold">QR Code / Slug</th>
              <th
                className="py-3 px-4 font-bold"
                title="Tracks QR batches and generation records"
              >
                Group / Batch
              </th>

              {isSuperAdmin && <th className="py-3 px-4 font-bold">Assigned Admin</th>}
              <th className="py-3 px-4 font-bold">Business & Customer</th>

              <th
                className="py-3 px-4 font-bold"
                title="The live destination URL. When scanned, the QR forwards here automatically."
              >
                Redirection Link
              </th>

              <th className="py-3 px-4 font-bold">Status</th>

              <th
                className="py-3 px-4 font-bold text-center"
                title="Total real-time QR scan interactions"
              >
                Scans
              </th>

              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={isSuperAdmin ? 9 : 8} className="py-16 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-black mb-2"></div>
                  <p className="text-xs font-medium">Loading QR links...</p>
                </td>
              </tr>
            ) : links.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 9 : 8} className="py-16 text-center text-slate-500">
                  <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm text-black">No QR Links Found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isSuperAdmin
                      ? 'Click "Generate QRs" to create your first bulk batch of smart links.'
                      : 'No links have been assigned to you yet by the Super Admin.'}
                  </p>
                </td>
              </tr>
            ) : (
              links.map((link) => {
                const isSelected = selectedIds.includes(link._id);

                return (
                  <tr
                    key={link._id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-slate-100/60' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(link._id)}
                        className="w-4 h-4 rounded-sm border-slate-300 text-black focus:ring-black cursor-pointer accent-black"
                      />
                    </td>

                    {/* QR Code / Slug */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-black bg-slate-100 px-2 py-1 rounded-md border border-slate-200 select-all">
                          {link.code}
                        </span>
                        <button
                          onClick={() => handleCopy(link.fullUrl || `${window.location.origin}/r/${link.code}`, link.code)}
                          title="Copy Link URL"
                          className="p-1 text-slate-400 hover:text-black hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                        >
                          {copiedCode === link.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono truncate max-w-[140px]">
                        {link.fullUrl || `/r/${link.code}`}
                      </span>
                    </td>

                    {/* Group / Batch Code */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {link.batchCode}
                      </span>
                    </td>

                    {/* Assigned Admin (Super Admin view) */}
                    {isSuperAdmin && (
                      <td className="py-3.5 px-4">
                        {link.assignedTo ? (
                          <div>
                            <p className="font-bold text-xs text-black">{link.assignedTo.name}</p>
                            <p className="text-[11px] text-slate-400">{link.assignedTo.phone || link.assignedTo.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    )}

                    {/* Business & Customer */}
                    <td className="py-3.5 px-4">
                      {link.businessName || link.customerName ? (
                        <div>
                          <p className="font-bold text-xs text-black truncate max-w-[160px]">
                            {link.businessName || 'Unnamed Business'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {link.customerName && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3 text-slate-400" />
                                {link.customerName}
                              </span>
                            )}
                            {link.customerPhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {link.customerPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not configured</span>
                      )}
                    </td>

                    {/* Redirection Link */}
                    <td className="py-3.5 px-4">
                      {link.redirectUrl ? (
                        <a
                          href={link.redirectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline max-w-[180px] truncate cursor-pointer"
                          title={link.redirectUrl}
                        >
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{link.redirectUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No target URL</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">{getStatusBadge(link.status)}</td>

                    {/* Scans Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-800">
                        {link.scanCount || 0}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Live / Pause Toggle Switch */}
                        {(() => {
                          const isConfigurable = (link.status === 'configured' || link.status === 'inactive') && Boolean(link.redirectUrl);
                          const isActive = link.status === 'configured';
                          const tooltipLabel = !isConfigurable
                            ? 'Configure destination URL first to enable switch'
                            : isActive
                            ? 'Live & Active · Click to Pause'
                            : 'Paused · Click to Activate Live traffic';

                          return (
                            <div className="relative group/toggle flex items-center">
                              <button
                                type="button"
                                disabled={!isConfigurable}
                                onClick={() => onToggleStatus && onToggleStatus(link)}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 select-none ${
                                  !isConfigurable
                                    ? 'opacity-35 cursor-not-allowed bg-slate-200 border border-slate-300/60'
                                    : isActive
                                    ? 'bg-emerald-500 hover:bg-emerald-600 cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.35)] active:scale-95'
                                    : 'bg-slate-300 hover:bg-slate-400 cursor-pointer active:scale-95'
                                }`}
                                aria-label={tooltipLabel}
                              >
                                <span
                                  className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.22),0_1px_1px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                    isActive ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                >
                                  {/* Internal micro-indicator dot
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                                      !isConfigurable
                                        ? 'bg-slate-300'
                                        : isActive
                                        ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]'
                                        : 'bg-slate-400'
                                    }`}
                                  /> */}
                                </span>
                              </button>

                              {/* Instant Floating Tooltip */}
                              <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover/toggle:flex flex-col items-end z-40 transition-all duration-150 drop-shadow-md">
                                <div className="whitespace-nowrap rounded-lg bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-white shadow-xl flex items-center gap-1.5 border border-slate-700/50">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      !isConfigurable
                                        ? 'bg-slate-400'
                                        : isActive
                                        ? 'bg-emerald-400 animate-pulse'
                                        : 'bg-rose-400'
                                    }`}
                                  />
                                  <span>{tooltipLabel}</span>
                                </div>
                                <div className="w-2 h-1 mr-4 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Subtle Divider */}
                        <div className="h-4 w-px bg-slate-200 mx-0.5" />

                        {/* Configure / Edit button */}
                        <button
                          onClick={() => onConfigureLink(link)}
                          className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer transition-colors"
                          title="Configure Redirection & Business Info"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* QR Preview & Download */}
                        <button
                          onClick={() => onPreviewQr(link)}
                          className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer transition-colors"
                          title="Preview & Download QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* [TEMP/CONFIGURABLE] Delete QR link */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => onDeleteLink && onDeleteLink(link)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 cursor-pointer transition-colors"
                            title="Delete QR Link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Touch-Friendly QR List (screens < 768px) */}
      <div className="block md:hidden p-3 space-y-3 bg-slate-50/50 min-h-[300px]">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-black mb-2"></div>
            <p className="text-xs font-medium">Loading QRs...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <QrCode className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-sm text-black">No QR Links Found</p>
            <p className="text-xs text-slate-400 mt-0.5">No QRs found matching your filters.</p>
          </div>
        ) : (
          links.map((link) => {
            const isSelected = selectedIds.includes(link._id);
            const isConfigured = link.status === 'configured' && link.redirectUrl;

            return (
              <div
                key={link._id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                  isSelected ? 'border-black ring-1 ring-black bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                {/* Header Row: Checkbox, Code Pill, Status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(link._id)}
                      className="w-5 h-5 rounded border-slate-300 text-black focus:ring-black cursor-pointer accent-black"
                    />
                    <span className="font-mono font-black text-sm text-black bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {link.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(link.fullUrl || `${window.location.origin}/r/${link.code}`, link.code)}
                      className="p-1.5 text-slate-400 hover:text-black rounded-md cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedCode === link.code ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Toggle Switch */}
                    {(() => {
                      const isConfigurable = (link.status === 'configured' || link.status === 'inactive') && Boolean(link.redirectUrl);
                      const isActive = link.status === 'configured';

                      return (
                        <button
                          type="button"
                          disabled={!isConfigurable}
                          onClick={() => onToggleStatus && onToggleStatus(link)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:outline-none select-none ${
                            !isConfigurable
                              ? 'opacity-35 cursor-not-allowed bg-slate-200 border border-slate-300/60'
                              : isActive
                              ? 'bg-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.35)] active:scale-90'
                              : 'bg-slate-300 active:scale-90'
                          }`}
                          title={
                            !isConfigurable
                              ? 'Configure destination URL first'
                              : isActive
                              ? 'QR is Active. Tap to Pause'
                              : 'QR is Paused. Tap to Activate'
                          }
                          aria-label={
                            !isConfigurable
                              ? 'Configure destination URL first'
                              : isActive
                              ? 'QR is Active. Tap to Pause'
                              : 'QR is Paused. Tap to Activate'
                          }
                        >
                          <span
                            className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.22),0_1px_1px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                              isActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                                !isConfigurable
                                  ? 'bg-slate-300'
                                  : isActive
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                          </span>
                        </button>
                      );
                    })()}

                    {/* Status Pill */}
                    {getStatusBadge(link.status)}
                  </div>
                </div>

                {/* Business & Destination Info */}
                <div className="space-y-1 mb-3">
                  <h4 className="font-bold text-sm text-black truncate">
                    {link.businessName || (
                      <span className="text-slate-400 font-normal italic">Unconfigured QR</span>
                    )}
                  </h4>

                  {link.redirectUrl ? (
                    <a
                      href={link.redirectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline truncate max-w-full cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{link.redirectUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-medium">
                      ⚡ Ready for customer setup
                    </p>
                  )}

                  {/* Meta Row: Scans & Batch */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Batch: <strong className="text-slate-600 font-mono">{link.batchCode}</strong></span>
                    <span>Scans: <strong className="text-black font-mono">{link.scanCount || 0}</strong></span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  {!isConfigured ? (
                    <button
                      type="button"
                      onClick={() => onQuickActivate ? onQuickActivate(link) : onConfigureLink(link)}
                      className="flex-1 h-11 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Activate on the Spot</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onConfigureLink(link)}
                        className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4 text-slate-700" />
                        <span>Edit Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onPreviewQr(link)}
                        className="h-11 px-3.5 bg-white border border-slate-300 hover:border-black text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="View & Download QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeleteLink && onDeleteLink(link)}
                      className="h-11 px-3 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center cursor-pointer"
                      title="Delete QR"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer matching wireframe (Prev [1] [2] [3] Next) */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-black">{links.length}</span> of{' '}
          <span className="font-bold text-black">{pagination.total || 0}</span> QR links
        </div>

        <div className="flex items-center gap-1">
          {/* Prev Button */}
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Prev
          </button>

          {/* Numbered Page Buttons */}
          {Array.from({ length: Math.min(5, pagination.totalPages || 1) }, (_, i) => {
            const pageNum = i + 1;
            const isCurrent = pagination.page === pageNum;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-black text-white shadow-2xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {pagination.totalPages > 5 && (
            <span className="text-xs text-slate-400 px-1">...</span>
          )}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= (pagination.totalPages || 1)}
            className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
