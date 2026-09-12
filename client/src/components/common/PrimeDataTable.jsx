import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Copy,
  Check,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * PrimeDataTable — Reusable, PrimeReact-Inspired Data Table
 *
 * Props:
 * - data: Array of row objects
 * - columns: Array of column definitions:
 *     - field: string (supports nested path e.g. "assignedTo.name")
 *     - header: string | ReactNode
 *     - sortable: boolean
 *     - width / minWidth / maxWidth: string (e.g. "150px")
 *     - align: "left" | "center" | "right"
 *     - body: (row, options) => ReactNode
 *     - truncate: boolean (adds clean ellipsis + hover title tooltip)
 *     - copyable: boolean (adds 1-click copy icon button)
 *     - className: string
 * - loading: boolean
 * - selectable: boolean (enables multi-select checkboxes)
 * - selectedRows: Array of selected row keys (e.g. IDs)
 * - onSelectionChange: (selectedKeys, selectedRows) => void
 * - rowKey: string (default: "_id")
 * - paginator: boolean (default: true)
 * - rows: number (default: 10)
 * - rowsPerPageOptions: Array<number> (default: [10, 25, 50, 100])
 * - totalRecords: number (for server pagination; defaults to data.length)
 * - page: number (1-indexed for server pagination)
 * - onPageChange: (newPage) => void
 * - onRowsChange: (newRows) => void
 * - sortField: string (server sort field)
 * - sortOrder: 1 | -1 | 0 (server sort direction)
 * - onSort: ({ sortField, sortOrder }) => void
 * - emptyMessage: string | ReactNode
 * - emptyIcon: LucideIcon
 * - emptyAction: ReactNode
 * - striped: boolean (subtle row striping)
 */
export default function PrimeDataTable({
  data = [],
  columns = [],
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = '_id',
  paginator = true,
  rows: controlledRows,
  rowsPerPageOptions = [10, 25, 50, 100],
  totalRecords,
  page: controlledPage,
  onPageChange,
  onRowsChange,
  sortField: controlledSortField,
  sortOrder: controlledSortOrder,
  onSort,
  emptyMessage = 'No records found',
  emptyIcon: EmptyIcon = Inbox,
  emptyAction = null,
  striped = false,
  className = '',
  tableClassName = '',
  mobileCard = null,
}) {
  // Internal pagination state for client-side mode
  const [internalPage, setInternalPage] = useState(1);
  const [internalRows, setInternalRows] = useState(rowsPerPageOptions[0] || 10);

  // Internal sorting state for client-side mode
  const [internalSortField, setInternalSortField] = useState(null);
  const [internalSortOrder, setInternalSortOrder] = useState(0); // 1 = asc, -1 = desc, 0 = none

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState(null);

  // Active page & rows
  const isControlledPagination = controlledPage !== undefined && onPageChange !== undefined;
  const currentPage = isControlledPagination ? controlledPage : internalPage;
  const currentRows = controlledRows !== undefined ? controlledRows : internalRows;

  // Active sort field & order
  const isControlledSort = controlledSortField !== undefined && onSort !== undefined;
  const activeSortField = isControlledSort ? controlledSortField : internalSortField;
  const activeSortOrder = isControlledSort ? controlledSortOrder : internalSortOrder;

  // Resolve nested field values (e.g. "assignedTo.name")
  const resolveFieldData = (dataObj, field) => {
    if (!dataObj || !field) return '';
    if (field.indexOf('.') === -1) return dataObj[field];
    const fields = field.split('.');
    let value = dataObj;
    for (let i = 0; i < fields.length; ++i) {
      if (value == null) return '';
      value = value[fields[i]];
    }
    return value;
  };

  // Client-side sorting
  const sortedData = useMemo(() => {
    if (isControlledSort || !activeSortField || activeSortOrder === 0) {
      return data;
    }
    const currentColumn = columns.find((c) => c.field === activeSortField);

    return [...data].sort((a, b) => {
      if (currentColumn && typeof currentColumn.sortFunction === 'function') {
        return currentColumn.sortFunction(a, b, activeSortOrder);
      }

      let valA = resolveFieldData(a, activeSortField);
      let valB = resolveFieldData(b, activeSortField);

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return activeSortOrder === 1
          ? valA.localeCompare(valB, undefined, { numeric: true })
          : valB.localeCompare(valA, undefined, { numeric: true });
      }

      if (valA < valB) return activeSortOrder === 1 ? -1 : 1;
      if (valA > valB) return activeSortOrder === 1 ? 1 : -1;
      return 0;
    });
  }, [data, activeSortField, activeSortOrder, isControlledSort, columns]);

  // Client-side pagination slice
  const processedData = useMemo(() => {
    if (isControlledPagination || !paginator) {
      return sortedData;
    }
    const startIndex = (currentPage - 1) * currentRows;
    return sortedData.slice(startIndex, startIndex + currentRows);
  }, [sortedData, isControlledPagination, paginator, currentPage, currentRows]);

  const totalCount = totalRecords !== undefined ? totalRecords : data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / currentRows));

  // Selection helpers
  const getRowId = (row) => row[rowKey] ?? row._id ?? row.id;

  const isAllCurrentPageSelected = useMemo(() => {
    if (!selectable || processedData.length === 0) return false;
    return processedData.every((row) => selectedRows.includes(getRowId(row)));
  }, [selectable, processedData, selectedRows]);

  const isPartiallySelected = useMemo(() => {
    if (!selectable || processedData.length === 0) return false;
    const selectedOnPage = processedData.filter((row) => selectedRows.includes(getRowId(row))).length;
    return selectedOnPage > 0 && selectedOnPage < processedData.length;
  }, [selectable, processedData, selectedRows]);

  const handleMasterCheckboxToggle = () => {
    if (!onSelectionChange) return;
    const currentPageIds = processedData.map(getRowId);

    if (isAllCurrentPageSelected) {
      // Unselect current page rows
      const newSelected = selectedRows.filter((id) => !currentPageIds.includes(id));
      onSelectionChange(newSelected, data.filter((r) => newSelected.includes(getRowId(r))));
    } else {
      // Select all current page rows (preserving others)
      const set = new Set([...selectedRows, ...currentPageIds]);
      const newSelected = Array.from(set);
      onSelectionChange(newSelected, data.filter((r) => newSelected.includes(getRowId(r))));
    }
  };

  const handleRowCheckboxToggle = (rowId, row) => {
    if (!onSelectionChange) return;
    let newSelected;
    if (selectedRows.includes(rowId)) {
      newSelected = selectedRows.filter((id) => id !== rowId);
    } else {
      newSelected = [...selectedRows, rowId];
    }
    onSelectionChange(newSelected, data.filter((r) => newSelected.includes(getRowId(r))));
  };

  // Sort handler
  const handleColumnSort = (col) => {
    if (!col.sortable || !col.field) return;

    let nextOrder = 1;
    if (activeSortField === col.field) {
      if (activeSortOrder === 1) nextOrder = -1;
      else if (activeSortOrder === -1) nextOrder = 0;
      else nextOrder = 1;
    }

    const nextField = nextOrder === 0 ? null : col.field;

    if (isControlledSort) {
      onSort({ sortField: nextField, sortOrder: nextOrder });
    } else {
      setInternalSortField(nextField);
      setInternalSortOrder(nextOrder);
    }
  };

  // Page change handler
  const handlePageSelect = (newPage) => {
    const targetPage = Math.max(1, Math.min(totalPages, newPage));
    if (isControlledPagination) {
      onPageChange(targetPage);
    } else {
      setInternalPage(targetPage);
    }
  };

  // Rows per page change handler
  const handleRowsChange = (e) => {
    const newRows = parseInt(e.target.value, 10);
    if (onRowsChange) {
      onRowsChange(newRows);
    } else {
      setInternalRows(newRows);
      setInternalPage(1);
    }
    if (isControlledPagination) {
      onPageChange(1);
    }
  };

  // 1-Click Copy helper
  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!', { duration: 1500 });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate page numbers to display in paginator
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * currentRows + 1;
  const endRecord = Math.min(totalCount, currentPage * currentRows);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col ${className}`}>
      {/* Table Scrollable Container with Fixed Header support */}
      <div className={`overflow-x-auto min-h-[360px] flex-1 ${mobileCard ? 'hidden md:block' : ''}`}>
        <table className={tableClassName || 'w-full text-left text-xs sm:text-sm border-collapse'}>
          <thead>
            <tr className="border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[11px] font-bold select-none">
              {/* Checkbox column */}
              {selectable && (
                <th className="py-3 px-4 w-11 shrink-0 text-center sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={handleMasterCheckboxToggle}
                      className="w-4 h-4 rounded-sm border-slate-300 text-black focus:ring-black cursor-pointer accent-black transition-all"
                      title={isAllCurrentPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                    />
                  </div>
                </th>
              )}

              {/* Dynamic Columns */}
              {columns.map((col, idx) => {
                const isSorted = col.sortable && activeSortField === col.field && activeSortOrder !== 0;
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';

                return (
                  <th
                    key={col.field || col.header || idx}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      maxWidth: col.maxWidth,
                    }}
                    onClick={() => col.sortable && handleColumnSort(col)}
                    className={`py-3 px-4 font-bold sticky top-0 z-20 bg-slate-50 border-b border-slate-200 transition-colors ${alignClass} ${
                      col.sortable
                        ? 'cursor-pointer hover:bg-slate-100 hover:text-black group'
                        : 'cursor-default'
                    } ${isSorted ? 'bg-slate-100 text-black font-extrabold' : ''} ${
                      col.headerClassName || ''
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'center'
                          ? 'justify-center'
                          : col.align === 'right'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="inline-flex shrink-0">
                          {isSorted ? (
                            activeSortOrder === 1 ? (
                              <ChevronUp className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-black" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-black transition-colors" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* Loading Skeleton Rows */}
            {loading ? (
              Array.from({ length: Math.min(currentRows, 6) }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {selectable && (
                    <td className="py-4 px-4 text-center">
                      <div className="w-4 h-4 bg-slate-200 rounded-sm mx-auto" />
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-col-${cIdx}`} className="py-4 px-4">
                      <div
                        className="h-4 bg-slate-100 rounded"
                        style={{
                          width: `${Math.max(40, 90 - (cIdx * 15) % 50)}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : processedData.length === 0 ? (
              /* Empty State */
              <tr>
                <td
                  colSpan={(selectable ? 1 : 0) + columns.length}
                  className="py-16 text-center text-slate-500"
                >
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                      <EmptyIcon className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-black mb-1">
                      {typeof emptyMessage === 'string' ? emptyMessage : 'No records available'}
                    </p>
                    {typeof emptyMessage !== 'string' && emptyMessage}
                    {emptyAction && <div className="mt-3">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              /* Data Rows */
              processedData.map((row, rowIndex) => {
                const id = getRowId(row);
                const isSelected = selectable && selectedRows.includes(id);

                return (
                  <tr
                    key={id || rowIndex}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-slate-100/75 hover:bg-slate-100'
                        : striped && rowIndex % 2 === 1
                        ? 'bg-slate-50/40 hover:bg-slate-50/90'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    {selectable && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleRowCheckboxToggle(id, row)}
                            className="w-4 h-4 rounded-sm border-slate-300 text-black focus:ring-black cursor-pointer accent-black"
                          />
                        </div>
                      </td>
                    )}

                    {/* Column Cells */}
                    {columns.map((col, cIdx) => {
                      const value = resolveFieldData(row, col.field);
                      const alignClass =
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left';

                      return (
                        <td
                          key={col.field || cIdx}
                          style={{
                            width: col.width,
                            minWidth: col.minWidth,
                            maxWidth: col.maxWidth,
                          }}
                          className={`py-3 px-4 ${alignClass} ${col.bodyClassName || ''}`}
                        >
                          {col.body ? (
                            col.body(row, { rowIndex, field: col.field, value })
                          ) : col.truncate || col.copyable ? (
                            /* Long Content Protected Cell with Copy / Tooltip */
                            <div
                              className={`flex items-center gap-1.5 ${
                                col.align === 'center'
                                  ? 'justify-center'
                                  : col.align === 'right'
                                  ? 'justify-end'
                                  : 'justify-start'
                              }`}
                            >
                              <span
                                className={`truncate font-medium ${
                                  col.truncate ? 'max-w-[200px]' : ''
                                }`}
                                title={String(value || '')}
                              >
                                {value || <span className="text-slate-400 italic">—</span>}
                              </span>

                              {col.copyable && value && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(String(value), `${id}-${col.field}`)}
                                  className="p-1 text-slate-400 hover:text-black hover:bg-slate-100 rounded-md cursor-pointer transition-colors shrink-0"
                                  title={`Copy ${col.header || ''}`}
                                >
                                  {copiedKey === `${id}-${col.field}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            value ?? <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Optional Mobile Cards View (displayed on mobile when mobileCard render prop is provided) */}
      {mobileCard && (
        <div className="block md:hidden p-3 space-y-3 bg-slate-50/50 min-h-[300px] flex-1">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`m-skel-${i}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="w-24 h-6 bg-slate-200 rounded-lg" />
                  <div className="w-16 h-5 bg-slate-200 rounded-full" />
                </div>
                <div className="w-3/4 h-4 bg-slate-100 rounded" />
                <div className="w-1/2 h-4 bg-slate-100 rounded" />
              </div>
            ))
          ) : processedData.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <EmptyIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-black mb-1">
                {typeof emptyMessage === 'string' ? emptyMessage : 'No records available'}
              </p>
              {emptyAction && <div className="mt-3">{emptyAction}</div>}
            </div>
          ) : (
            processedData.map((row, rIdx) => {
              const id = getRowId(row);
              const isSelected = selectable && selectedRows.includes(id);
              return (
                <React.Fragment key={id || rIdx}>
                  {mobileCard(row, {
                    rowIndex: rIdx,
                    isSelected,
                    onToggleSelect: () => handleRowCheckboxToggle(id, row),
                  })}
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {/* PrimeReact-Inspired Paginator Bar */}
      {paginator && (
        <div className="bg-slate-50/70 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
          {/* Left: Record Range Summary */}
          <div className="text-slate-600 font-medium">
            Showing <strong className="text-black font-mono">{startRecord}</strong> to{' '}
            <strong className="text-black font-mono">{endRecord}</strong> of{' '}
            <strong className="text-black font-mono">{totalCount.toLocaleString()}</strong> entries
          </div>

          {/* Right: Rows per page selector + Page Jump Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rows Per Page Dropdown */}
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="hidden sm:inline">Rows per page:</span>
              <select
                value={currentRows}
                onChange={handleRowsChange}
                className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-2xs"
              >
                {rowsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              {/* First Page (hidden on small mobile to conserve space) */}
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => handlePageSelect(1)}
                className="hidden sm:inline-flex w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => handlePageSelect(currentPage - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
              {pageNumbers.map((p) => {
                const isActive = p === currentPage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => handlePageSelect(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-black text-white shadow-xs'
                        : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => handlePageSelect(currentPage + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page (hidden on small mobile to conserve space) */}
              <button
                type="button"
                disabled={currentPage >= totalPages || loading}
                onClick={() => handlePageSelect(totalPages)}
                className="hidden sm:inline-flex w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
