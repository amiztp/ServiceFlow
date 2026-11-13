import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ActionButton, Modal } from '../components'
import { setAccessToken } from '../lib/api'
import { demoAccount } from '../lib/demo-account'
import type { Session, User } from '../types/client'

type SessionContextValue = {
  user: User | null
  signIn: (session: Session) => void
  signOut: () => void
  requestLogout: () => void
}
const SessionContext = createContext<SessionContextValue>({
  user: null, signIn: () => {}, signOut: () => {}, requestLogout: () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [logoutAccount, setLogoutAccount] = useState<string | null>(null)
  const navigate = useNavigate()

  function signOut() {
    setAccessToken(null)
    demoAccount.logout()
    setLogoutAccount(null)
    setUser(null)
  }
  function confirmLogout() {
    if (!user || logoutAccount !== user.id) return
    signOut()
    navigate('/', { replace: true })
  }

  return <SessionContext.Provider value={{
    user,
    signIn: session => {
      if (session.access_token) setAccessToken(session.access_token)
      setUser(session.user)
    },
    signOut,
    requestLogout: () => { if (user) setLogoutAccount(user.id) },
  }}>
    {children}
    <Modal
      open={!!user && logoutAccount === user.id}
      title="Log out of your account?"
      description={`Are you sure you want to log out of ${user?.name || 'your account'}? You will need to sign in again to access your workspace.`}
      onClose={() => setLogoutAccount(null)}
    >
      <div className="flex flex-wrap gap-4">
        <ActionButton onClick={() => setLogoutAccount(null)}>Stay signed in</ActionButton>
        <ActionButton variant="void" onClick={confirmLogout}>Yes, log out</ActionButton>
      </div>
    </Modal>
  </SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)

export function destination(user: User) {
  if (user.email_verified === false) return '/verify-email'
  if (user.must_change_password) return '/change-password'
  if (user.role === 'manager' && user.company_status !== 'APPROVED') return '/pending-verification'
  return user.role === 'client' ? '/client' : '/workspace'
}

export function ClientGuard({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (destination(user) !== '/client') return <Navigate to={destination(user)} replace />
  return <>{children}</>
}
