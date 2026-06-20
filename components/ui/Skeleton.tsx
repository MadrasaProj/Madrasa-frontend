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
