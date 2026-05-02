'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import { copy } from '../definitions/copy'

interface LoadMoreButtonProps {
  currentOffset: number
  limit: number
  total: number
}

export function LoadMoreButton({
  currentOffset,
  limit,
  total,
}: LoadMoreButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const nextOffset = currentOffset + limit
  const hasMore = nextOffset < total

  if (!hasMore) return null

  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('offset', String(nextOffset))
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isPending}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-4 text-[13px] font-bold text-signal transition-colors',
          isPending && 'pointer-events-none opacity-60',
        )}
      >
        {isPending ? 'Loading…' : copy.loadMore}
      </button>
    </div>
  )
}
