import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { clientService } from '../lib/client-service'
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
  //bypass the login for demo purposes
  const [user, setUser] = useState<User | null>(() => {
    const bypass = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    if (!bypass) return null;
    return {
      id: 'dev-user',
      name: 'Dev User',
      email: 'dev@test.com',
      role: 'manager',
      email_verified: true,
      must_change_password: false,
      company_status: 'APPROVED',
    } as User;
  })

  const [logoutAccount, setLogoutAccount] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) return
    clientService.me().then(setUser).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  return user.role === 'client' ? '/client' :
         user.role === 'manager' ? '/manager' :
         user.role === 'employee' ? '/employee/jobs' :
         user.role === 'admin' ? '/admin' : '/workspace'
}

export function ClientGuard({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (destination(user) !== '/client') return <Navigate to={destination(user)} replace />
  return <>{children}</>
}