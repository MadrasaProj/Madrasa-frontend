import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}

export function PageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <Skeleton className="h-44 rounded-3xl" />
      <div className="space-y-1">
        <Skeleton className="h-5 w-28" />
      </div>
      <SkeletonGrid count={2} />
      <Skeleton className="h-5 w-24" />
      <SkeletonList count={3} />
    </div>
  )
}

export function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-[100svh] w-full max-w-3xl lg:max-w-7xl lg:pl-64 mx-auto bg-primary-50/50 px-4 py-6" role="status" aria-label="Loading dashboard">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <PageSkeleton />
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)} role="status" aria-label="Loading records">
      <div className="hidden lg:grid grid-cols-4 gap-4 border-b border-gray-100 p-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3 w-3/4" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-gray-100 p-4 last:border-0 lg:grid lg:grid-cols-4 lg:gap-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full lg:hidden" />
          <div className="flex-1 space-y-2 lg:contents">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="hidden h-3 w-2/3 lg:block" />
            <Skeleton className="hidden h-6 w-16 rounded-full lg:block" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-5 rounded-2xl bg-white p-5", className)} role="status" aria-label="Loading details">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <SkeletonList count={3} />
    </div>
  )
}

export function FormSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-5", className)} role="status" aria-label="Loading form">
      <Skeleton className="h-6 w-44" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-11 w-full rounded-xl" /></div>
      ))}
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
  )
}
