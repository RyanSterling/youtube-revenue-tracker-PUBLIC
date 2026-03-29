import { SignIn } from '@clerk/clerk-react'

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-primary">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  )
}
