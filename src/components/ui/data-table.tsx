import { useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Column,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Balanced Ledger datatable: accounting-register styling with client-side
// sorting, global text filtering, and pagination. Column defs carry the
// per-screen rendering; this component owns behavior and chrome.

export function SortableHeader<T>({
  column,
  children,
  align,
}: {
  column: Column<T, unknown>;
  children: ReactNode;
  align?: "right";
}) {
  const dir = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(dir === "asc")}
      className={cn(
        "flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground",
        align === "right" && "ml-auto",
      )}
    >
      {children}
      {dir === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : dir === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Placeholder for the built-in global search box; omit to hide search. */
  searchPlaceholder?: string;
  /** Extra filter controls rendered beside the search box. */
  toolbar?: ReactNode;
  initialSorting?: SortingState;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  /** Rendered when there are no rows at all (before filtering). */
  emptyState?: ReactNode;
  /** Table footer row(s), given the rows that survived filtering. */
  footer?: (filteredRows: T[]) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder,
  toolbar,
  initialSorting = [],
  pageSize = 10,
  onRowClick,
  emptyState,
  footer,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const hay = Object.values(row.original as Record<string, unknown>)
        .map((v) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join(" ")
        .toLowerCase();
      return hay.includes(String(filterValue).toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const filteredRows = useMemo(
    () => table.getFilteredRowModel().rows.map((r) => r.original),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.getFilteredRowModel().rows],
  );

  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="border bg-surface">
      {(searchPlaceholder || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
          {searchPlaceholder && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-64 pl-8 text-[13px]"
              />
            </div>
          )}
          {toolbar}
          <div className="ml-auto text-[11px] text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {data.length} records
          </div>
        </div>
      )}

      <table className="w-full text-[13px]">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b text-left">
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                  style={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn("ledger-rule", onRowClick && "cursor-pointer hover:bg-muted/50")}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-[12px] text-muted-foreground"
              >
                No records match these filters.
              </td>
            </tr>
          )}
        </tbody>
        {footer && filteredRows.length > 0 && <tfoot>{footer(filteredRows)}</tfoot>}
      </table>

      <div className="flex items-center gap-3 border-t px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Rows
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-7 w-16 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="tabular text-[11px] text-muted-foreground">
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
