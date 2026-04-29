import Image from 'next/image'
import { cn } from '@/lib/utils'

interface EventImageProps {
  src: string | null
  alt: string
  fallbackInitial?: string
  className?: string
  fill?: boolean
  sizes?: string
}

export function EventImage({
  src,
  alt,
  fallbackInitial,
  className,
  fill = false,
  sizes,
}: EventImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-surface-2 text-fg-subtle select-none',
          className,
        )}
        aria-label={alt}
      >
        <span className="text-2xl font-bold opacity-40">
          {fallbackInitial ?? '♪'}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? '(max-width: 768px) 100vw, 50vw'}
          className="object-cover"
          loading="lazy"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget
            target.style.display = 'none'
            const fallback = target.nextElementSibling
            if (fallback) (fallback as HTMLElement).style.display = 'flex'
          }}
        />
      )}
      {/* image-tint overlay — blends hotlinked images into active theme */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--image-tint)' }}
        aria-hidden
      />
    </div>
  )
}
