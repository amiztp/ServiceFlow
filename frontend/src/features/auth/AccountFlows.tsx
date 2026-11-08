import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton, SurfaceCard, TextField } from '../../components'
import { Notice, PageHeader } from '../../components/client-shared'
import { destination, useSession } from '../../app/session'
import { demoMode } from '../../lib/api'
import { demoAccount, requireDemo } from '../../lib/demo-account'
import { clientService } from '../../lib/client-service'

export function EmailVerificationPage() {
  const { user, signIn } = useSession()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  if (!user) return <Navigate to="/login" replace />
  if (user.email_verified) return <Navigate to={destination(user)} replace />

  async function perform(verify: boolean) {
    if (pending) return
    setPending(true)
    setError('')
    try {
      requireDemo('Email verification')
      if (verify) {
        const next = demoAccount.redeem(search.get('token') || '', 'verify')
        signIn({ access_token: '', user: next })
        navigate(destination(next), { replace: true })
      } else {
        setToken(demoAccount.issueLink(demoAccount.profile().email, 'verify') || '')
      }
    } catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }

  return <div className="mx-auto max-w-xl">
    <PageHeader title="Verify your email" description="Confirm your email address before opening your workspace." />
    <SurfaceCard className="space-y-5 p-6">
      <Notice>{demoMode ? 'Demo verification uses a single-use sample link valid for 15 minutes. No email is sent.' : 'Email verification is awaiting the backend integration.'}</Notice>
      <ActionButton variant="stamp" disabled={pending || !demoMode} onClick={() => void perform(!!search.get('token'))}>
        {pending ? 'Please wait…' : search.get('token') ? 'Confirm email verification' : 'Create sample verification link'}
      </ActionButton>
      {token && <Link className="sf-link block" to={`/verify-email?token=${encodeURIComponent(token)}`}>Open sample verification link →</Link>}
      {error && <Notice error>{error}</Notice>}
    </SurfaceCard>
  </div>
}

export function PasswordResetPage() {
  const [search, setSearch] = useSearchParams()
  const { signOut } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sampleToken, setSampleToken] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const reset = search.has('token')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setError('')
    if (reset && password !== confirm) { setError('Passwords must match.'); return }
    setPending(true)
    try {
      requireDemo('Password recovery')
      if (reset) {
        demoAccount.redeem(search.get('token') || '', 'reset', password)
        signOut()
        setSearch({})
        setSampleToken('')
        setPassword('')
        setConfirm('')
        setMessage('Your sample password has been changed. You can now sign in.')
      } else {
        setSampleToken(demoAccount.issueLink(email.trim(), 'reset') || '')
        setMessage('If a sample account exists, a demo reset link is available below. No email is sent.')
      }
    } catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }

  return <div className="mx-auto max-w-xl">
    <PageHeader title={reset ? 'Choose a new password' : 'Reset your password'} description="Recover access to your ServiceFlow account." />
    <SurfaceCard className="space-y-5 p-6">
      <Notice>{demoMode ? 'Sample recovery links expire in 15 minutes and can be used once. All sample accounts reset on refresh.' : 'Password recovery is awaiting the backend integration.'}</Notice>
      <form className="space-y-5" onSubmit={submit}>
        {reset ? <>
          <TextField label="New password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={event => setConfirm(event.target.value)} />
        </> : <TextField label="Email address" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />}
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <ActionButton type="submit" variant="stamp" disabled={pending || !demoMode}>{pending ? 'Please wait…' : reset ? 'Save new password' : 'Request reset link'}</ActionButton>
      </form>
      {sampleToken && <Link className="sf-link block" to={`/password-reset?token=${sampleToken}`}>Open sample password reset link →</Link>}
      <Link className="sf-link block" to="/login">Return to sign in →</Link>
    </SurfaceCard>
  </div>
}

export function PendingVerificationPage() {
  const { user, signIn } = useSession()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'manager') return <Navigate to={destination(user)} replace />
  const rejected = user.company_status === 'REJECTED'
  async function refresh() {
    setPending(true)
    setError('')
    try { signIn({ access_token: '', user: await clientService.me() }) }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }
  return <div className="mx-auto max-w-2xl">
    <PageHeader title={rejected ? 'Your application needs attention' : 'Your company is awaiting approval'} description="An administrator reviews company applications before they become public." />
    <SurfaceCard className="space-y-5 p-6">
      <p>Application status <strong>{user.company_status || 'PENDING'}</strong></p>
      {demoMode && <Notice>This is a sample application. Approval can only be performed by an administrator in the connected system.</Notice>}
      {error && <Notice error>{error}</Notice>}
      <ActionButton disabled={pending} onClick={() => void refresh()}>{pending ? 'Checking…' : 'Check status'}</ActionButton>
      <Link className="sf-link block" to="/provider-onboarding">View onboarding checklist →</Link>
      {user.company_status === 'APPROVED' && <Link className="sf-link block" to="/workspace">Open workspace →</Link>}
    </SurfaceCard>
  </div>
}

export function ProviderOnboardingPage() {
  const { user } = useSession()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'manager') return <Navigate to={destination(user)} replace />
  const steps = [
    { title: 'Register company and manager', complete: true },
    { title: 'Verify your email address', complete: user.email_verified === true },
    { title: 'Receive administrator approval', complete: user.company_status === 'APPROVED' },
  ]
  return <div className="mx-auto max-w-2xl">
    <PageHeader title="Get your company ready" description="Track your account setup, then complete operational setup in the manager workspace." />
    <SurfaceCard className="space-y-5 p-6">
      <p className="sf-mono text-sm">{steps.filter(step => step.complete).length} / {steps.length} account steps complete</p>
      <ol className="space-y-4">{steps.map(step => <li key={step.title} className="flex flex-wrap justify-between gap-2 border-b border-line pb-4">
        <span>{step.title}</span><strong>{step.complete ? 'Complete' : 'Pending'}</strong>
      </li>)}</ol>
      <Notice>After approval, complete your company details, active services, working hours, employees and public policy in the manager workspace.</Notice>
      <Link className="sf-link block" to={user.email_verified === false ? '/verify-email' : '/pending-verification'}>Continue account setup →</Link>
      {user.company_status === 'APPROVED' && <Link className="sf-link block" to="/workspace">Continue to manager workspace →</Link>}
    </SurfaceCard>
  </div>
}
