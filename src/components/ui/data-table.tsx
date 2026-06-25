import React, { useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  emptyMessage?: string
  searchable?: boolean
  searchPlaceholder?: string
  defaultPageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = 'No records found.',
  searchable = true,
  searchPlaceholder = 'Search…',
  defaultPageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: (v) => {
      setGlobalFilter(v)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const filteredTotal = table.getFilteredRowModel().rows.length
  const rowStart = pageIndex * pageSize + 1
  const rowEnd = Math.min(rowStart + pageSize - 1, filteredTotal)
  const isFiltered = globalFilter.trim().length > 0
  const isSorted = sorting.length > 0

  return (
    <div className="flex flex-col">

      {/* ── Toolbar ── */}
      {searchable && (
        <div
          className="flex items-center gap-3 border-b px-6 py-3.5"
          style={{ borderColor: '#1E2D42' }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'h-8 w-full rounded-lg border bg-surface-3 pl-8 pr-8 text-[13px] text-text-primary transition-colors',
                'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent',
                globalFilter ? 'border-accent/50' : 'border-border'
              )}
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Live count */}
          <span className="flex-shrink-0 text-[12px] tabular-nums text-text-muted">
            {isFiltered
              ? <>{filteredTotal} <span className="text-text-muted/50">of {data.length}</span></>
              : <>{data.length} row{data.length !== 1 ? 's' : ''}</>
            }
          </span>

          {isSorted && (
            <button
              onClick={() => setSorting([])}
              className="flex-shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              Clear sort
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ borderBottom: '1px solid #1E2D42' }}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted first:pl-6 last:pr-6',
                        canSort && 'select-none'
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="group inline-flex items-center gap-1.5 transition-colors hover:text-text-primary"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className={cn(
                            'transition-colors',
                            sortDir ? 'text-accent' : 'text-text-muted/40 group-hover:text-text-muted'
                          )}>
                            {sortDir === 'asc'
                              ? <ChevronUp className="h-3 w-3" />
                              : sortDir === 'desc'
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronsUpDown className="h-3 w-3" />}
                          </span>
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-[13px] text-text-muted">
                  {isFiltered
                    ? <>No results for <span className="font-mono text-text-secondary">"{globalFilter}"</span></>
                    : emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'transition-colors hover:bg-[#1C2638]/40',
                    i !== table.getRowModel().rows.length - 1 && 'border-b border-[#1E2D42]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4 text-[13px] text-text-primary first:pl-6 last:pr-6">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ── */}
      {filteredTotal > 0 && (
        <div
          className="flex flex-col gap-3 border-t px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: '#1E2D42' }}
        >
          {/* Left: row range + page-size picker */}
          <div className="flex items-center gap-3">
            <span className="text-[12px] tabular-nums text-text-muted">
              {filteredTotal === 0 ? '0 rows' : `${rowStart}–${rowEnd} of ${filteredTotal}`}
              {isFiltered && (
                <span className="text-text-muted/50"> (filtered from {data.length})</span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                  table.setPageIndex(0)
                }}
                className="h-7 rounded-md border border-border bg-surface-2 px-2 text-[12px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: page nav */}
          <div className="flex items-center gap-1">
            <span className="mr-2 text-[12px] tabular-nums text-text-muted">
              Page {pageIndex + 1} of {pageCount}
            </span>

            <PagBtn
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </PagBtn>
            <PagBtn
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </PagBtn>

            {/* Page number pills */}
            {getPageRange(pageIndex, pageCount).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[12px] text-text-muted">…</span>
              ) : (
                <PagBtn
                  key={p}
                  onClick={() => table.setPageIndex(Number(p) - 1)}
                  active={Number(p) - 1 === pageIndex}
                >
                  {p}
                </PagBtn>
              )
            )}

            <PagBtn
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </PagBtn>
            <PagBtn
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </PagBtn>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pagination button ────────────────────────────────────────────────────────

function PagBtn({
  children, onClick, disabled, active, 'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  'aria-label'?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-[12px] font-medium transition-colors',
        active
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
        disabled && 'pointer-events-none opacity-30'
      )}
    >
      {children}
    </button>
  )
}

// ─── Page range builder ───────────────────────────────────────────────────────
// Returns e.g. [1, 2, 3, '…', 12] or [1, '…', 5, 6, 7, '…', 12]

function getPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const page = current + 1
  const pages: (number | '…')[] = []

  if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total)
  } else if (page >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '…', page - 1, page, page + 1, '…', total)
  }

  return pages
}

// ─── MobileCard ───────────────────────────────────────────────────────────────

export function MobileCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-xl border p-4', className)}
      style={{ background: '#111827', borderColor: '#1E2D42' }}
    >
      {children}
    </div>
  )
}
