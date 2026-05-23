import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type SortDir = "asc" | "desc"

export interface Column<T> {
  key: string
  header: string
  render: (row: T, index: number) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClass?: string
}

export interface PaginationConfig {
  page: number
  totalPages: number
  total: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  loading?: boolean
  error?: string | null
  pagination?: PaginationConfig
  onRowClick?: (row: T) => void
  onSort?: (key: string, dir: SortDir) => void
  sortKey?: string
  sortDir?: SortDir
  emptyIcon?: React.ElementType
  emptyMessage?: string
  emptySubtext?: string
  className?: string
  mobileRender?: (row: T, index: number) => React.ReactNode
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading,
  error,
  pagination,
  onRowClick,
  onSort,
  sortKey,
  sortDir,
  emptyIcon: EmptyIcon,
  emptyMessage = "No records found",
  emptySubtext,
  className,
  mobileRender,
}: DataTableProps<T>) {
  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable || !onSort) return
    onSort(col.key, sortKey === col.key && sortDir === "asc" ? "desc" : "asc")
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">{error}</div>
  }

  const emptyState = (
    <div className="text-center py-16 text-gray-400">
      {EmptyIcon && <EmptyIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />}
      <p className="font-semibold">{emptyMessage}</p>
      {emptySubtext && <p className="text-sm mt-1">{emptySubtext}</p>}
    </div>
  )

  const pageSizeOptions = pagination?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS

  // ── Pagination bar (shared desktop+mobile) ──────────────────────────────────
  const paginationBar = pagination && (
    <div className="flex items-center justify-between mt-4 px-1 gap-3 flex-wrap">
      {/* Left: total + page size */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {pagination.total} total
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 hidden sm:inline">Show</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              pagination.onPageSizeChange(Number(e.target.value))
              pagination.onPageChange(1)
            }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {pageSizeOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400 hidden sm:inline">per page</span>
        </div>
      </div>

      {/* Right: prev/next */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 font-medium min-w-[5rem] text-center">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className={cn("w-full", className)}>
      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  className={cn(
                    "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50",
                    col.sortable && onSort && "cursor-pointer select-none hover:text-gray-700 hover:bg-gray-100 transition-colors",
                    col.headerClass,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && onSort && (
                      sortKey === col.key
                        ? sortDir === "asc"
                          ? <ChevronUp className="w-3 h-3 text-emerald-600" />
                          : <ChevronDown className="w-3 h-3 text-emerald-600" />
                        : <ChevronsUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>{emptyState}</td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-gray-50 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-emerald-50/40",
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : data.length === 0 ? (
          emptyState
        ) : (
          <AnimatePresence mode="popLayout">
            {data.map((row, i) => (
              <motion.div
                key={keyExtractor(row)}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "bg-white rounded-2xl p-4 border border-gray-100 transition-all",
                  onRowClick && "cursor-pointer hover:border-emerald-200 hover:shadow-sm",
                )}
              >
                {mobileRender ? (
                  mobileRender(row, i)
                ) : (
                  <div className="space-y-1.5">
                    {columns.filter(c => c.key !== "actions").map(col => (
                      <div key={col.key} className="flex justify-between items-center gap-4 text-sm">
                        <span className="text-xs text-gray-400 uppercase tracking-wide shrink-0">{col.header}</span>
                        <span className="font-medium text-gray-800 text-right truncate">{col.render(row, i)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {paginationBar}
    </div>
  )
}
