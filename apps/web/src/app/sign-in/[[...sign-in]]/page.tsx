import { SignIn, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { AuthLoadingState } from '../AuthLoadingState'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      {/* Without a <ClerkLoading> branch this page is an empty min-h-screen box
          whenever clerk-js does not arrive, which is what Brave Shields or any
          other blocker looks like: a blank white screen, no error. */}
      <ClerkLoading>
        <AuthLoadingState />
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn />
      </ClerkLoaded>
    </main>
  )
}
