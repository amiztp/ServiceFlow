import { Link } from 'react-router-dom'
import { destination, useSession } from '../../app/session'

export function AccountIdentity() {
  const { user } = useSession()
  if (!user) return null
  return <Link
    to={user.role === 'client' ? '/client?tab=profile' : destination(user)}
    className="sf-account-identity"
    aria-label={`Open account settings for ${user.name}`}
    title={user.name}
  >
    <img src="/images/sample-avatar.svg" alt="Sample profile picture" width={38} height={38} />
    <span><strong>{user.name}</strong></span>
  </Link>
}
