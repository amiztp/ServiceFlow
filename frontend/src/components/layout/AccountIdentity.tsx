import { useState } from 'react'
import { Link } from 'react-router-dom'
import { destination, useSession } from '../../app/session'

export function AccountIdentity() {
  const { user } = useSession()
  const [failed, setFailed] = useState(false)
  if (!user) return null
  const initials = user.name.split(' ').map(part => part[0]).slice(0, 2).join('') || 'SF'
  return <Link
    to={user.role === 'client' ? '/client?tab=profile' : destination(user)}
    className="sf-account-identity"
    aria-label={`Open account settings for ${user.name}`}
    title={user.name}
  >
    {failed ? <span className="sf-avatar" aria-hidden="true">{initials}</span> : <img src="/images/sample-avatar.svg" alt="Sample profile picture" width={38} height={38} onError={() => setFailed(true)} />}
    <span><strong>{user.name}</strong></span>
  </Link>
}
