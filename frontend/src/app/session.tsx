import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { setAccessToken } from '../lib/api'
import type { Session, User } from '../types/client'
const SessionContext = createContext<{ user: User | null; signIn: (session: Session) => void; signOut: () => void }>({ user: null, signIn: () => {}, signOut: () => {} })
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  return <SessionContext.Provider value={{ user, signIn: session => { if (session.access_token) setAccessToken(session.access_token); setUser(session.user) }, signOut: () => { setAccessToken(null); setUser(null) } }}>{children}</SessionContext.Provider>
}
export const useSession = () => useContext(SessionContext)
export function destination(user: User) {
  if (user.must_change_password) return '/change-password'
  if (user.role === 'manager' && user.company_status !== 'APPROVED') return '/account-status'
  return user.role === 'client' ? '/client' : '/workspace'
}
export function ClientGuard({ children }: { children: ReactNode }) {
  const { user } = useSession(); const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (destination(user) !== '/client') return <Navigate to={destination(user)} replace />
  return <>{children}</>
}
