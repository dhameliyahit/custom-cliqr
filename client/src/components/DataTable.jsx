import { useState, useMemo } from 'react';
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
import PrimeDataTable from './common/PrimeDataTable';

export default function DataTable({
  links = [],
  loading = false,
  pagination = { page: 1, totalPages: 1, total: 0, limit: 20 },
  onPageChange,
  onRowsChange,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onSelectionChange,
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

  // Selection change adapter
  const handleSelectionChange = (newSelectedIds) => {
    if (onSelectionChange) {
      onSelectionChange(newSelectedIds);
    } else if (onToggleSelectAll && (newSelectedIds.length === 0 || newSelectedIds.length === links.length)) {
      onToggleSelectAll();
    } else if (onToggleSelect) {
      // Diff and toggle
      const added = newSelectedIds.find((id) => !selectedIds.includes(id));
      const removed = selectedIds.find((id) => !newSelectedIds.includes(id));
      if (added) onToggleSelect(added);
      else if (removed) onToggleSelect(removed);
    }
  };

  // PrimeDataTable Column Definitions
  const columns = useMemo(() => {
    const cols = [
      {
        field: 'code',
        header: 'QR Code / Slug',
        minWidth: '170px',
        body: (link) => (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-black bg-slate-100 px-2 py-1 rounded-md border border-slate-200 select-all">
                {link.code}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    link.fullUrl || `${window.location.origin}/r/${link.code}`,
                    link.code
                  )
                }
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
            <span
              className="text-[10px] text-slate-400 block mt-0.5 font-mono truncate max-w-[150px]"
              title={link.fullUrl || `/r/${link.code}`}
            >
              {link.fullUrl || `/r/${link.code}`}
            </span>
          </div>
        ),
      },
      {
        field: 'batchCode',
        header: 'Group / Batch',
        minWidth: '130px',
        body: (link) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            {link.batchCode}
          </span>
        ),
      },
    ];

    if (isSuperAdmin) {
      cols.push({
        field: 'assignedTo.name',
        header: 'Assigned Admin',
        minWidth: '160px',
        body: (link) =>
          link.assignedTo ? (
            <div>
              <p className="font-bold text-xs text-black">{link.assignedTo.name}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                {link.assignedTo.phone || link.assignedTo.email}
              </p>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          ),
      });
    }

    cols.push(
      {
        field: 'businessName',
        header: 'Business & Customer',
        minWidth: '180px',
        body: (link) =>
          link.businessName || link.customerName ? (
            <div>
              <p
                className="font-bold text-xs text-black truncate max-w-[170px]"
                title={link.businessName || 'Unnamed Business'}
              >
                {link.businessName || 'Unnamed Business'}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                {link.customerName && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[100px]" title={link.customerName}>
                      {link.customerName}
                    </span>
                  </span>
                )}
                {link.customerPhone && (
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    {link.customerPhone}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Not configured</span>
          ),
      },
      {
        field: 'redirectUrl',
        header: 'Redirection Link',
        minWidth: '200px',
        body: (link) =>
          link.redirectUrl ? (
            <a
              href={link.redirectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline max-w-[190px] truncate cursor-pointer"
              title={link.redirectUrl}
            >
              <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{link.redirectUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic">No target URL</span>
          ),
      },
      {
        field: 'status',
        header: 'Status',
        minWidth: '135px',
        body: (link) => getStatusBadge(link.status),
      },
      {
        field: 'scanCount',
        header: 'Scans',
        align: 'center',
        width: '90px',
        body: (link) => (
          <span className="font-mono font-bold text-xs bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-800">
            {link.scanCount || 0}
          </span>
        ),
      },
      {
        field: 'actions',
        header: 'Actions',
        align: 'right',
        minWidth: '180px',
        body: (link) => {
          const isConfigurable =
            (link.status === 'configured' || link.status === 'inactive') &&
            Boolean(link.redirectUrl);
          const isActive = link.status === 'configured';
          const tooltipLabel = !isConfigurable
            ? 'Configure destination URL first to enable switch'
            : isActive
            ? 'Live & Active · Click to Pause'
            : 'Paused · Click to Activate Live traffic';

          return (
            <div className="flex items-center justify-end gap-2">
              {/* Live / Pause Toggle Switch */}
              <div className="relative group/toggle flex items-center">
                <button
                  type="button"
                  disabled={!isConfigurable}
                  onClick={() => onToggleStatus && onToggleStatus(link)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:outline-none select-none ${
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
                  />
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

              {/* Subtle Divider */}
              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              {/* Configure / Edit button */}
              <button
                type="button"
                onClick={() => onConfigureLink(link)}
                className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer transition-colors"
                title="Configure Redirection & Business Info"
              >
                <Edit className="w-4 h-4" />
              </button>

              {/* QR Preview & Download */}
              <button
                type="button"
                onClick={() => onPreviewQr(link)}
                className="p-1.5 text-slate-600 hover:text-black hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer transition-colors"
                title="Preview & Download QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>

              {/* Delete QR link (SuperAdmin only) */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => onDeleteLink && onDeleteLink(link)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-rose-200 cursor-pointer transition-colors"
                  title="Delete QR Link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        },
      }
    );

    return cols;
  }, [isSuperAdmin, copiedCode, onConfigureLink, onPreviewQr, onDeleteLink, onToggleStatus]);

  // Mobile Touch Card View (< 768px)
  const renderMobileCard = (link, { isSelected, onToggleSelect: toggleCardSelect }) => {
    const isConfigured = link.status === 'configured' && link.redirectUrl;
    const isConfigurable =
      (link.status === 'configured' || link.status === 'inactive') && Boolean(link.redirectUrl);
    const isActive = link.status === 'configured';

    return (
      <div
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
              onChange={toggleCardSelect}
              className="w-5 h-5 rounded border-slate-300 text-black focus:ring-black cursor-pointer accent-black"
            />
            <span className="font-mono font-black text-sm text-black bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {link.code}
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  link.fullUrl || `${window.location.origin}/r/${link.code}`,
                  link.code
                )
              }
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
            >
              <span
                className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.22),0_1px_1px_rgba(0,0,0,0.1)] ring-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

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
            <span>
              Batch: <strong className="text-slate-600 font-mono">{link.batchCode}</strong>
            </span>
            <span>
              Scans: <strong className="text-black font-mono">{link.scanCount || 0}</strong>
            </span>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          {!isConfigured ? (
            <button
              type="button"
              onClick={() => (onQuickActivate ? onQuickActivate(link) : onConfigureLink(link))}
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
  };

  return (
    <PrimeDataTable
      data={links}
      columns={columns}
      loading={loading}
      selectable={true}
      selectedRows={selectedIds}
      onSelectionChange={handleSelectionChange}
      rowKey="_id"
      paginator={true}
      totalRecords={pagination.total}
      page={pagination.page}
      rows={pagination.limit || 20}
      rowsPerPageOptions={[10, 20, 50, 100]}
      onPageChange={onPageChange}
      onRowsChange={onRowsChange}
      emptyIcon={QrCode}
      emptyMessage={
        <div>
          <p className="font-bold text-sm text-black">No QR Links Found</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSuperAdmin
              ? 'Click "Generate QRs" to create your first bulk batch of smart links.'
              : 'No links have been assigned to you yet by the Super Admin.'}
          </p>
        </div>
      }
      tableClassName="min-w-[950px] w-full text-left text-xs sm:text-sm border-collapse"
      mobileCard={renderMobileCard}
    />
  );
}
