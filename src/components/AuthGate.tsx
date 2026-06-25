import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import { LoginPage } from '@/pages/LoginPage'
import { useAuthStore } from '@/store/auth.store'
import { useAppStore } from '@/store/app.store'
import type { Role } from '@/store/app.store'

export function AuthGate() {
  const user = useAuthStore((s) => s.user)
  const { setRole, setTenant } = useAppStore()

  // On mount: if a session was restored from sessionStorage, sync the app store
  useEffect(() => {
    if (user) {
      setRole(user.role as Role)
      if (user.tenant) setTenant(user.tenant)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) return <LoginPage />

  return <RouterProvider router={router} />
}
