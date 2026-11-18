import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { ActionButton, SelectField, TextField } from '../../components'
import { Notice } from '../../components/client-shared'
import { destination, useSession } from '../../app/session'
import { ApiError, demoMode } from '../../lib/api'
import { clientService } from '../../lib/client-service'

export function AuthPage({ register = false }: { register?: boolean }) {
  const [kind, setKind] = useState('client')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const { signIn, user } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  if (user) return <Navigate to={destination(user)} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true); setError(''); setFields({})
    try {
      const session = register
        ? await clientService.register(kind, { name: name.trim(), email: email.trim(), phone: phone.trim(), password, ...(kind === 'company' ? { company_name: company.trim() } : {}) })
        : await clientService.login(email.trim(), password)
      if (session) {
        signIn(session)
        const from = location.state?.from
        const safeReturn = session.user.role === 'client' && session.user.email_verified !== false && !session.user.must_change_password && typeof from === 'string' && /^\/(?!\/)/.test(from) && !from.includes('\\')
        navigate(safeReturn ? from : destination(session.user), { replace: true })
      } else setSuccess('Registration submitted. Your account may need activation before you can sign in.')
    } catch (cause) {
      setError((cause as Error).message)
      if (cause instanceof ApiError) setFields(cause.fieldErrors)
    } finally { setPending(false) }
  }
  return <div className="sf-auth-layout">
    <aside className="sf-auth-story"><div><p className="sf-eyebrow">A CLEARER WAY TO GET THINGS DONE</p><h2>A little help.<br />A lot less hassle.</h2><p>Your home services, organised from the first request to the final receipt.</p><ul>{['Find a company that fits your needs', 'Approve the price before work begins', 'Keep every appointment and invoice together'].map(text => <li key={text}><Check size={17} />{text}</li>)}</ul></div><div className="sf-auth-story-footnote"><ShieldCheck size={18} /><span>Your decisions. Your details. Your workspace.</span></div></aside>
    <section className="sf-auth-form"><p className="sf-eyebrow">YOUR SERVICEFLOW ACCOUNT</p><h1>{register ? 'Let’s get started' : 'Welcome back'}</h1><p className="sf-auth-description">{register ? 'Create a client account or register your service company.' : 'Sign in to manage your requests and see what’s next.'}</p>
      <form onSubmit={submit}>{register && <><SelectField label="Account type" value={kind} onChange={event => setKind(event.target.value)}><option value="client">Client — request services</option><option value="company">Company — provide services</option></SelectField><TextField label={kind === 'company' ? 'Manager name' : 'Full name'} required autoComplete="name" value={name} onChange={event => setName(event.target.value)} error={fields.name} />{kind === 'company' && <TextField label="Company name" required value={company} onChange={event => setCompany(event.target.value)} error={fields.company_name} />}<TextField label="Phone number" type="tel" required autoComplete="tel" minLength={7} maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} error={fields.phone} placeholder="e.g. 077 123 4567" /></>}
        <TextField label="Email address" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} error={fields.email} placeholder="you@example.com" />
        <div className="sf-password-field"><TextField label="Password" type={showPassword ? 'text' : 'password'} required minLength={register ? 8 : 1} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} error={fields.password} hint={register ? 'Use at least 8 characters.' : undefined} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        {error && <Notice error>{error}</Notice>}{success && <Notice>{success} <Link className="sf-link" to="/login">Sign in</Link></Notice>}
        <ActionButton className="w-full" type="submit" variant="stamp" disabled={pending || !!success}>{pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={16} /></ActionButton>
      </form>
      {!register && <Link className="sf-link mt-5 inline-block" to="/password-reset">Forgot your password?</Link>}
      <p className="sf-auth-toggle">{register ? 'Already have an account?' : 'New to ServiceFlow?'} <Link to={register ? '/login' : '/register'} state={location.state}>{register ? 'Sign in' : 'Create an account'}</Link></p>
      {demoMode && <div className="sf-demo-login"><strong>Explore before you get started.</strong><p>{register ? 'Demo registration creates a sample session only.' : 'Sample client: nimal@example.com · DemoClient123!'}</p><p>Sample data resets on refresh. No real accounts or bookings.</p>{!register && <button type="button" disabled={pending} onClick={() => { setEmail('nimal@example.com'); setPassword('DemoClient123!') }}>Fill sample account<ArrowRight size={14} /></button>}</div>}
    </section>
  </div>
}
