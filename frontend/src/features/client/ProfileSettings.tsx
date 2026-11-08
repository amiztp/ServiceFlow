import { useState, type FormEvent } from 'react'
import { ActionButton, SurfaceCard, TextField } from '../../components'
import { Notice, PageHeader, Resource, useResource } from '../../components/client-shared'
import { useSession } from '../../app/session'
import { demoMode } from '../../lib/api'
import { demoAccount, requireDemo } from '../../lib/demo-account'
import { clientService } from '../../lib/client-service'

export function ProfileSettings() {
  const { user, requestLogout } = useSession()
  const resource = useResource(async () => {
    requireDemo('Profile settings')
    return demoAccount.profile()
  })
  return <>
    <PageHeader title="Profile / Settings" description="Keep your contact details and account password up to date." />
    <Resource {...resource} retry={resource.reload}>
      {resource.data && <ProfileForm initial={resource.data} />}
    </Resource>
    <SurfaceCard className="mt-6 max-w-3xl space-y-4 p-6">
      <h2 className="sf-display text-xl font-semibold">Account session</h2>
      <p className="text-sm text-text-secondary">Signed in as {user?.name}. End your current session when you have finished.</p>
      <ActionButton variant="void" onClick={requestLogout}>Log out</ActionButton>
    </SurfaceCard>
  </>
}

function ProfileForm({ initial }: { initial: { name: string; email: string; phone: string } }) {
  const { signIn } = useSession()
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent, changePassword: boolean) {
    event.preventDefault()
    if (pending) return
    setError('')
    setMessage('')
    if (changePassword && password !== confirm) { setError('Passwords must match.'); return }
    setPending(true)
    try {
      requireDemo('Profile settings')
      if (changePassword) {
        await clientService.login(initial.email, currentPassword)
        await clientService.changePassword(password)
        setCurrentPassword('')
        setPassword('')
        setConfirm('')
        setMessage('Your sample password was updated.')
      } else {
        const user = demoAccount.updateProfile(name.trim(), phone.trim())
        signIn({ access_token: '', user })
        setMessage('Your sample profile was updated.')
      }
    } catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }
  return <div className="max-w-3xl space-y-5">
    {demoMode && <Notice>Profile changes apply to this sample session and reset on refresh.</Notice>}
    <SurfaceCard className="p-6">
      <form className="space-y-5" onSubmit={event => void submit(event, false)}>
        <h2 className="sf-display text-xl font-semibold">Contact details</h2>
        <TextField label="Full name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} />
        <TextField label="Email address" disabled value={initial.email} hint="Email changes require a new verification flow." />
        <TextField label="Phone number" type="tel" required minLength={7} maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} />
        <ActionButton variant="stamp" type="submit" disabled={pending || !name.trim() || !phone.trim()}>Save profile</ActionButton>
      </form>
    </SurfaceCard>
    <SurfaceCard className="p-6">
      <form className="space-y-5" onSubmit={event => void submit(event, true)}>
        <h2 className="sf-display text-xl font-semibold">Change password</h2>
        <TextField label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        <TextField label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={event => setConfirm(event.target.value)} />
        <ActionButton variant="stamp" type="submit" disabled={pending}>Update password</ActionButton>
      </form>
    </SurfaceCard>
    {error && <Notice error>{error}</Notice>}
    {message && <Notice>{message}</Notice>}
  </div>
}
