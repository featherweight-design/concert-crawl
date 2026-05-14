import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { FeedbackEdgeTabGate } from '@/components/consumer/feedback'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <>
      {children}
      <FeedbackEdgeTabGate />
    </>
  )
}
