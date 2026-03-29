import { SignUp } from '@clerk/clerk-react'

export default function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-primary">
      <SignUp
        routing="path"
        path="/signup"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}
