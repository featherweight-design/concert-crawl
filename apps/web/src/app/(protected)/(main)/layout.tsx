import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <AppHeader />
      {children}
      <BottomNav />
    </div>
  )
}
