// app/(auth)/layout.tsx
import { redirectIfAuthenticated } from '@/lib/auth/helpers'

export default async function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  await redirectIfAuthenticated()
  return <>{children}</>
}