'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { buttonVariants } from '@/components/ui/button'
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
          buttonVariants({ variant: 'outline' }),
          isPending && 'opacity-60 pointer-events-none',
        )}
      >
        {isPending ? 'Loading…' : copy.loadMore}
      </button>
    </div>
  )
}
