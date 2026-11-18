import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ActionButton, SurfaceCard, TextField } from '../../components'
import { Notice, PageHeader } from '../../components/client-shared'
import { destination, useSession } from '../../app/session'
import { demoMode } from '../../lib/api'
import { clientService } from '../../lib/client-service'
export function AccountStatusPage() {
  const { user, signIn } = useSession(); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'manager') return <Navigate to={destination(user)} replace />
  async function refresh() { setPending(true); setError(''); try { if (!demoMode) { const current = await clientService.me(); signIn({ access_token: '', user: current }) } } catch (e) { setError((e as Error).message) } finally { setPending(false) } }
  return <><PageHeader title={user.company_status === 'REJECTED' ? 'Application needs attention' : 'Your company is awaiting approval'} description={user.company_status === 'REJECTED' ? 'Review the application with your team. Profile editing and resubmission belong to the manager workspace.' : 'An administrator will review your company before it can appear in the directory.'} /><SurfaceCard className="max-w-2xl space-y-4 p-6"><p>Current status: <strong>{user.company_status || 'PENDING'}</strong></p><ActionButton disabled={pending} onClick={refresh}>{pending ? 'Checking…' : 'Check status'}</ActionButton>{error && <Notice error>{error}</Notice>}{user.company_status === 'APPROVED' && <Link className="sf-link block" to="/workspace">Open workspace →</Link>}{demoMode && <Notice>This is a sample application. No real company has been submitted.</Notice>}</SurfaceCard></>
}
export function ChangePasswordPage() {
  const { user, signIn } = useSession(); const navigate = useNavigate(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState('')
  if (!user) return <Navigate to="/login" replace />
  async function submit(event: FormEvent) { event.preventDefault(); if (pending) return; if (password !== confirm) { setError('Passwords must match.'); return } setPending(true); setError(''); try { await clientService.changePassword(password); const next = demoMode ? { ...user!, must_change_password: false } : await clientService.me(); signIn({ access_token: '', user: next }); navigate(destination(next)) } catch (e) { setError((e as Error).message) } finally { setPending(false) } }
  return <div className="mx-auto max-w-lg"><PageHeader title="Set your own password" description="Change your temporary password before accessing your workspace." /><SurfaceCard className="p-6"><form className="space-y-5" onSubmit={submit}><TextField label="New password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><TextField label="Confirm new password" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />{error && <Notice error>{error}</Notice>}<ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Save password'}</ActionButton></form></SurfaceCard></div>
}
export function WorkspacePage() { const { user } = useSession(); if (!user) return <Navigate to="/login" replace />; if (destination(user) !== '/workspace') return <Navigate to={destination(user)} replace />; return <><PageHeader title="Your operational workspace" description={`Signed in as ${user.name} (${user.role}).`} /><Notice>The manager, employee and admin screens will connect here when Member 2’s workspace is integrated.</Notice></> }
