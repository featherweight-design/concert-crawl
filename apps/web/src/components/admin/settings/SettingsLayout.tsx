// apps/web/src/components/admin/settings/SettingsLayout.tsx
interface SettingsLayoutProps {
  heading: string
  description?: string
  children: React.ReactNode
}

export function SettingsLayout({
  heading,
  description,
  children,
}: SettingsLayoutProps) {
  return (
    <section className="flex flex-col gap-4 border-b border-border pb-8 last:border-0 last:pb-0">
      <div>
        <h2 className="text-base font-semibold text-fg">{heading}</h2>
        {description && (
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
