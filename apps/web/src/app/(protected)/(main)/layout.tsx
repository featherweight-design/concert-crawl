import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'
import { InstallSlot } from '@/components/pwa/InstallSlot'
import { OfflinePill } from '@/components/pwa/OfflinePill'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <AppHeader
        rightSlots={
          <>
            <OfflinePill />
            <InstallSlot />
          </>
        }
      />
      {children}
      <BottomNav />
    </div>
  )
}
