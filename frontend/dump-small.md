

===== FILE: src\app\session.tsx =====
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
  //const [user, setUser] = useState<User | null>(null)
  
  //bypass teh login for demo purposes
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



===== FILE: src\components\layout\AccountIdentity.tsx =====
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



===== FILE: src\components\layout\ClientShell.tsx =====
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, BriefcaseBusiness, Building2, Check, ChevronRight, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Receipt, Search, Settings, X } from 'lucide-react'
import { useSession } from '../../app/session'
import { AccountIdentity } from './AccountIdentity'
import { ThemeToggle } from '../ThemeToggle'
import { demoMode, liveApiMode } from '../../lib/api'

const clientLinks = [
  { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
  { label: 'Requests', href: '/client/requests', icon: ClipboardList },
  { label: 'Quotations', href: '/client/quotations', icon: FileText },
  { label: 'Jobs', href: '/client/jobs', icon: BriefcaseBusiness },
  { label: 'Invoices', href: '/client/invoices', icon: Receipt },
  { label: 'Profile / Settings', href: '/client/profile', icon: Settings },
]

export function Brand() {
  return <Link to="/" className="sf-brand" aria-label="ServiceFlow home"><img src="/serviceflow-logo.png" alt="" className="sf-brand-logo" /><span><span className="sf-brand-name-service">Service</span><span className="sf-brand-name-flow">Flow</span><span className="sf-brand-dot">.</span></span></Link>
}

export function ClientShell() {
  const { user, requestLogout: logout } = useSession()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const clientArea = location.pathname.startsWith('/client') && user?.role === 'client'
  const authArea = ['/login', '/register', '/change-password', '/verify-email', '/password-reset', '/pending-verification', '/provider-onboarding'].includes(location.pathname)
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
    const section = clientLinks.find(link => link.href !== '/client' && (location.pathname.startsWith(link.href) || location.search.includes(`tab=${link.href.split('/').pop()}`)))?.label
    document.title = `ServiceFlow Â· ${clientArea ? section || 'Dashboard' : authArea ? 'Your account' : 'Find your service'}`
  }, [location.pathname, location.search, clientArea, authArea])
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView())
  }, [location.pathname, location.hash])

  const initials = user?.name.split(' ').map(part => part[0]).slice(0, 2).join('') || 'SF'
  const section = clientLinks.find(link => link.href !== '/client' && (location.pathname.startsWith(link.href) || location.search.includes(`tab=${link.href.split('/').pop()}`)))?.label || 'Overview'

  const navigation = <nav aria-label="App navigation" className="sf-workspace-nav">
    <p className="sf-nav-label">YOUR WORKSPACE</p>
    {clientLinks.map(({ label, href, icon: Icon }) => <NavLink key={href} to={href === '/client' ? href : `/client?tab=${href.split('/').pop()}`} className={`sf-nav-item ${(href === '/client' ? !location.search.includes('tab=') : location.search.includes(`tab=${href.split('/').pop()}`)) ? 'is-active' : ''}`}><Icon size={19} aria-hidden="true" /><span>{label}</span><ChevronRight size={14} className="sf-nav-arrow" aria-hidden="true" /></NavLink>)}
    <p className="sf-nav-label mt-7">DISCOVER</p><Link to="/companies" className="sf-nav-item"><Search size={19} aria-hidden="true" />Find a service<ArrowUpRight size={15} className="ml-auto" aria-hidden="true" /></Link>
  </nav>

  return <div className={clientArea ? 'sf-workspace' : 'sf-site'}>
    <a className="sf-skip" href="#main-content">Skip to content</a>
    {liveApiMode ? <div className="sf-demo"><span className="sf-demo-dot" /><strong>Connected API</strong><span className="hidden sm:inline">Accounts, providers and requests use the shared backend</span><span className="sf-demo-divider">/</span><span>Later workflow screens use sample data</span></div> : demoMode && <div className="sf-demo"><span className="sf-demo-dot" /><strong>Demo workspace</strong><span className="hidden sm:inline">Explore with sample data</span><span className="sf-demo-divider">/</span><span>No real bookings Â· resets on refresh</span></div>}
    {clientArea ? <>
      <aside className="sf-workspace-sidebar"><div className="sf-sidebar-brand"><Brand /></div>{navigation}<div className="sf-sidebar-tip"><div className="sf-sidebar-tip-icon"><Check size={17} /></div><strong>Every step, in one place.</strong><p>From your first request to your final invoice.</p><Link to="/companies">Find your next service <ArrowUpRight size={15} /></Link></div><div className="sf-sidebar-user"><span className="sf-avatar">{initials}</span><div><strong>{user.name}</strong><span>Client account</span></div><button type="button" aria-label="Log out" onClick={logout}><LogOut size={18} /></button></div></aside>
      <div className="sf-workspace-body"><header className="sf-workspace-topbar"><div className="sf-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{section}</strong></div><nav aria-label="Main navigation" className="sf-client-top-actions ml-auto flex items-center gap-3"><Link to="/companies" className="sf-topbar-action sf-topbar-discover"><Search size={16} />Find a service</Link>
        <AccountIdentity />
        <ThemeToggle />
        <button type="button" onClick={logout} className="sf-small-button" aria-label="Log out">
          <LogOut size={16} aria-hidden="true" /><span>Log out</span>
        </button>
      </nav><button className="sf-mobile-menu" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-client-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></header>{menuOpen && <div id="mobile-client-navigation" className="sf-mobile-drawer"><Brand />{navigation}<button type="button" onClick={logout} className="sf-mobile-signout"><LogOut size={18} />Log out</button></div>}<main id="main-content" tabIndex={-1} className="sf-client-main"><Outlet /></main><div className="sf-workspace-footnote">ServiceFlow Â· Clear steps. Better service.<span>Asia/Colombo Â· LKR</span></div></div>
      <nav className="sf-bottom-nav" aria-label="Quick navigation">{clientLinks.filter(link => !['Requests', 'Profile / Settings'].includes(link.label)).map(({ href, label, icon: Icon }) => <NavLink key={href} to={href === '/client' ? href : `/client?tab=${href.split('/').pop()}`} className={(href === '/client' ? !location.search.includes('tab=') : location.search.includes(`tab=${href.split('/').pop()}`)) ? 'is-active' : ''}><Icon size={20} /><span>{label === 'Dashboard' ? 'Overview' : label}</span></NavLink>)}</nav>
    </> : <>
      <header className="sf-public-header"><div className="sf-public-header-inner"><Brand /><nav aria-label="Main navigation"><ThemeToggle /><NavLink className="sf-public-nav-link" to="/companies">Find a service</NavLink>{!authArea && <Link className="sf-public-nav-link sf-how-link" to="/#how-it-works">How it works</Link>}{user ? <><AccountIdentity /><button type="button" onClick={logout} className="sf-small-button">Log out</button></> : <><Link className="sf-public-nav-link" to="/login">Sign in</Link><Link className="sf-small-button sf-small-button-dark" to="/register">Create account<ArrowUpRight size={15} /></Link></>}</nav></div></header>
      <main id="main-content" tabIndex={-1} className={`sf-public-main ${authArea ? 'sf-account-main' : ''}`}><Outlet /></main>
      <footer className="sf-public-footer"><div><Brand /><p>A simpler way to get the job done.</p></div><div className="sf-footer-links"><Link to="/companies">Find a service</Link><Link to="/style-guide">Component guide</Link><span>Asia/Colombo Â· LKR</span></div><p className="sf-footer-note"><Building2 size={15} />Built for local service companies and the people who count on them.</p></footer>
    </>}
  </div>
}



===== FILE: src\components\client-shared.tsx =====
import { useEffect, useState, type DependencyList, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ActionButton, EmptyState, Skeleton, StatusBadge, type WorkflowStatus } from './index'
export const money = (value: number) => `LKR ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const dateTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
export const today = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}
export function useResource<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [revision, refresh] = useState(0)
  useEffect(() => { let active = true; setLoading(true); setError(''); setData(undefined)
    loader().then(value => { if (active) setData(value) }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this page.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [...deps, revision])
  return { data, error, loading, reload: () => refresh(n => n + 1) }
}
export function Resource({ loading, error, retry, children }: { loading: boolean; error: string; retry: () => void; children: ReactNode }) {
  if (loading) return <Skeleton rows={5} />
  if (error) return <div role="alert" className="sf-card p-6"><h2 className="sf-display font-semibold">We couldnâ€™t load this</h2><p className="my-3">{error}</p><ActionButton onClick={retry}>Try again</ActionButton></div>
  return <>{children}</>
}
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="mb-7 flex flex-wrap items-end justify-between gap-5"><div>{eyebrow && <p className="sf-mono mb-2 text-xs text-text-secondary">{eyebrow}</p>}<h1 className="sf-display text-3xl font-bold md:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-text-secondary">{description}</p>}</div>{children}</header>
}
const statusMap: Record<string, WorkflowStatus> = { NEW: 'awaiting', QUOTED: 'awaiting', CONVERTED: 'approved', DRAFT: 'awaiting', SENT: 'awaiting', APPROVED: 'approved', DECLINED: 'declined', REJECTED: 'declined', CANCELLED: 'cancelled', JOB_CREATED: 'awaiting', SCHEDULE_PROPOSED: 'awaiting', SCHEDULE_CONFIRMED: 'scheduled', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', UNPAID: 'unpaid', PAID: 'paid' }
const statusLabels: Record<string, string> = { NEW: 'Request sent', QUOTED: 'Quotation ready', CONVERTED: 'Job created', DRAFT: 'Draft', SENT: 'Awaiting your approval', APPROVED: 'Approved', DECLINED: 'Declined', REJECTED: 'Rejected', CANCELLED: 'Cancelled', JOB_CREATED: 'Job created', SCHEDULE_PROPOSED: 'Appointment proposed', SCHEDULE_CONFIRMED: 'Appointment confirmed', IN_PROGRESS: 'Work in progress', COMPLETED: 'Completed', UNPAID: 'Unpaid', PAID: 'Paid' }
export const statusLabel = (status: string) => statusLabels[status] || status.toLowerCase().replaceAll('_', ' ')
export function RecordStatus({ status }: { status: string }) { return <StatusBadge status={statusMap[status] || 'awaiting'} label={statusLabel(status)} /> }
export function EmptyRecords({ title }: { title: string }) { return <EmptyState title={title} description="Your records will appear here as your service request progresses."><Link className="sf-link" to="/companies">Browse companies â†’</Link></EmptyState> }
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) { return <p role={error ? 'alert' : 'status'} className={`rounded-docket border p-3 text-sm ${error ? 'border-red-300 bg-red-50 text-red-800' : 'border-border bg-paper'}`}>{children}</p> }



===== FILE: src\components\index.tsx =====
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import {
  BadgeCheck, Ban, Banknote, BriefcaseBusiness, Building2, CalendarCheck2, CalendarDays,
  CheckCheck, ChevronDown, CircleCheck, CircleX, ClipboardList, Clock3, Download, Ellipsis,
  Eye, FileSearch, FileText, Grid2X2, LayoutDashboard, ListFilter, MapPin, Menu, MessageCircleQuestion,
  Pencil, Play, Plus, Receipt, Search, Settings, ShieldCheck, Sparkles, TriangleAlert, Upload, UserRound,
  UserRoundCheck, Users, X, type LucideIcon
} from 'lucide-react'

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ')
const iconMap = { dashboard: LayoutDashboard, browse: Search, categories: Grid2X2, requests: ClipboardList,
  quotations: FileText, jobs: BriefcaseBusiness, schedule: CalendarDays, invoices: Receipt,
  ai: Sparkles, company: Building2, team: Users, settings: Settings } satisfies Record<string, LucideIcon>
export type NavIcon = keyof typeof iconMap
export { Tabs } from './Tabs'

export type ActionVariant = 'stamp' | 'stub' | 'void' | 'ghost' | 'icon'
export function ActionButton({ variant = 'stub', size = 'default', icon: Icon, children, className, title, 'aria-label': ariaLabel, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ActionVariant; size?: 'default' | 'small'; icon?: LucideIcon }) {
  if (variant === 'icon' && !ariaLabel) throw new Error('Icon-only ActionButton requires aria-label')
  return <button type="button" {...props} aria-label={ariaLabel} title={title ?? (variant === 'icon' ? ariaLabel : undefined)}
    className={cx('sf-action inline-flex items-center justify-center gap-2 rounded-docket font-semibold',
      variant === 'icon' ? 'h-10 w-10 sf-stub' : size === 'small' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-5 text-sm',
      variant !== 'icon' && ('sf-' + variant), className)}>
    {Icon && <Icon size={variant === 'icon' ? 18 : 17} strokeWidth={2} aria-hidden="true"/>}{children}
  </button>
}

export type WorkflowStatus = 'awaiting' | 'approved' | 'declined' | 'scheduled' | 'in_progress' | 'completed' | 'paid' | 'unpaid' | 'cancelled'
const statuses: Record<WorkflowStatus, { label: string; icon: LucideIcon; color: string; bg: string; solid?: boolean }> = {
  awaiting: { label:'Awaiting response',icon:Clock3,color:'var(--sf-warning)',bg:'var(--sf-warning-bg)' },
  approved: { label:'Approved',icon:CircleCheck,color:'var(--sf-success)',bg:'var(--sf-success-bg)' },
  declined: { label:'Declined',icon:CircleX,color:'var(--sf-error)',bg:'var(--sf-error-bg)' },
  scheduled: { label:'Scheduled',icon:CalendarCheck2,color:'var(--sf-info)',bg:'var(--sf-info-bg)' },
  in_progress: { label:'In progress',icon:Play,color:'var(--sf-info)',bg:'var(--sf-info-bg)' },
  completed: { label:'Completed',icon:CheckCheck,color:'var(--sf-success)',bg:'var(--sf-success-bg)' },
  paid: { label:'Paid',icon:BadgeCheck,color:'#fff',bg:'var(--sf-success)',solid:true },
  unpaid: { label:'Unpaid',icon:TriangleAlert,color:'var(--sf-warning)',bg:'var(--sf-warning-bg)' },
  cancelled: { label:'Cancelled',icon:Ban,color:'#fff',bg:'var(--sf-cancelled)',solid:true }
}
export function StatusBadge({ status, label }: { status: WorkflowStatus; label?: string }) {
  const config = statuses[status]; const Icon = config.icon
  return <span className="sf-tag" style={{ color:config.color,background:config.bg,...(config.solid ? { borderColor:config.bg } : {}) }}>
    <Icon size={13} strokeWidth={2} aria-hidden="true"/>{label ?? config.label}
  </span>
}

type FieldBase = { label:string; hint?:string; error?:string; required?:boolean; id?:string }
export function TextField({ label, hint, error, id, required, className, ...props }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId(), fieldId = id ?? generated, messageId = fieldId + '-message'
  return <div className="flex flex-col gap-1.5">
    <label htmlFor={fieldId} className="text-[13.5px] font-medium">{label}{required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}</label>
    <input {...props} id={fieldId} required={required} aria-invalid={!!error} aria-describedby={error || hint ? messageId : undefined} className={cx('sf-input',className)}/>
    {(error || hint) && <p id={messageId} className={cx('text-[13px]',error ? 'text-[#B93832]' : 'text-text-secondary')}>{error && <TriangleAlert className="mr-1 inline" size={13} aria-hidden="true"/>}{error ?? hint}</p>}
  </div>
}
export function SelectField({ label, hint, error, id, required, children, className, ...props }: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId(), fieldId = id ?? generated, messageId = fieldId + '-message'
  return <div className="flex flex-col gap-1.5">
    <label htmlFor={fieldId} className="text-[13.5px] font-medium">{label}{required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}</label>
    <select {...props} id={fieldId} required={required} aria-invalid={!!error} aria-describedby={error || hint ? messageId : undefined} className={cx('sf-input',className)}>{children}</select>
    {(error || hint) && <p id={messageId} className={cx('text-[13px]',error ? 'text-[#B93832]' : 'text-text-secondary')}>{error ?? hint}</p>}
  </div>
}
export function TextAreaField({ label, hint, error, id, required, className, ...props }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId(), fieldId = id ?? generated, messageId = fieldId + '-message'
  return <div className="flex flex-col gap-1.5"><label htmlFor={fieldId} className="text-[13.5px] font-medium">{label}{required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}</label>
    <textarea {...props} id={fieldId} required={required} aria-invalid={!!error} aria-describedby={error || hint ? messageId : undefined} className={cx('sf-input min-h-24',className)}/>
    {(error || hint) && <p id={messageId} className={cx('text-[13px]',error ? 'text-[#B93832]' : 'text-text-secondary')}>{error ?? hint}</p>}
  </div>
}
export const DateField = (props: Omit<React.ComponentProps<typeof TextField>,'type'>) => <TextField {...props} type="date"/>
export const TimeField = (props: Omit<React.ComponentProps<typeof TextField>,'type'>) => <TextField {...props} type="time"/>

export function SurfaceCard({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx('sf-card',className)}>{children}</div>
}
export function DetailRow({ icon: Icon, label, children }: { icon:LucideIcon;label:string;children:ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-dashed border-line py-2.5 last:border-0">
    <span className="inline-flex items-center gap-2 text-[13.5px] text-text-secondary"><Icon size={16} aria-hidden="true"/>{label}</span>
    <span className="sf-tabular text-right text-sm font-semibold">{children}</span>
  </div>
}
export function JobTicketCard({ id, title, status, client, schedule, employee, amount, children }: {
  id:string;title:string;status:WorkflowStatus;client:string;schedule:string;employee?:string;amount?:string;children?:ReactNode
}) {
  return <SurfaceCard className="overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4"><h3 className="sf-display text-base font-semibold">{title}</h3><span className="sf-mono rounded-[3px] border border-border px-2 py-1 text-[11px] text-text-secondary">{id}</span></div>
    <div className="space-y-2 px-5 py-4"><StatusBadge status={status}/><DetailRow icon={UserRound} label="Client">{client}</DetailRow><DetailRow icon={CalendarDays} label="Schedule">{schedule}</DetailRow>
      {employee && <DetailRow icon={UserRoundCheck} label="Employee">{employee}</DetailRow>}</div>
    <div className="sf-separator flex items-center justify-between gap-3 px-5 py-4"><span className="sf-mono text-[11px] text-text-secondary">Job total</span><strong className="sf-tabular font-mono text-lg">{amount ?? 'Pending quote'}</strong></div>
    {children && <div className="border-t border-line px-5 py-4">{children}</div>}
  </SurfaceCard>
}
export function RequestCard({ id, service, client, description, status, submitted, children }: {
  id:string;service:string;client:string;description:string;status:WorkflowStatus;submitted:string;children?:ReactNode
}) {
  return <SurfaceCard className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
    <h3 className="sf-display font-semibold">{service}</h3><span className="sf-mono rounded-[3px] border border-border px-2 py-1 text-[11px] text-text-secondary">{id}</span></div>
    <div className="space-y-3 px-5 py-4"><StatusBadge status={status}/><p className="text-sm">{description}</p>
      <DetailRow icon={UserRound} label="Client">{client}</DetailRow><DetailRow icon={CalendarDays} label="Submitted">{submitted}</DetailRow></div>
    {children && <div className="sf-separator px-5 py-4">{children}</div>}</SurfaceCard>
}
export function QuotationCard({ id, service, fee, callout, total, status, children }: {
  id:string;service:string;fee:string;callout:string;total:string;status:WorkflowStatus;children?:ReactNode
}) {
  return <SurfaceCard className="p-5"><div className="flex flex-wrap items-center justify-between gap-2">
    <h3 className="sf-display font-semibold">{service}</h3><span className="sf-mono text-[11px] text-text-secondary">{id}</span></div>
    <div className="my-4"><StatusBadge status={status}/></div><DetailRow icon={BriefcaseBusiness} label="Service fee">{fee}</DetailRow>
    <DetailRow icon={MapPin} label="Call-out">{callout}</DetailRow>
    <div className="sf-separator mt-3 flex justify-between pt-4"><span className="sf-mono text-xs">Quoted total</span><strong className="sf-tabular text-lg">{total}</strong></div>
    {children && <div className="mt-4">{children}</div>}</SurfaceCard>
}
export function InvoiceCard({ number, client, fee, callout, total, status, onDownload }: {
  number:string;client:string;fee:string;callout:string;total:string;status:'paid'|'unpaid';onDownload?:()=>void
}) {
  return <SurfaceCard className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="sf-display font-semibold">Invoice {number}</h3><StatusBadge status={status}/></div>
    <DetailRow icon={UserRound} label="Client">{client}</DetailRow><DetailRow icon={BriefcaseBusiness} label="Service fee">{fee}</DetailRow><DetailRow icon={MapPin} label="Call-out">{callout}</DetailRow>
    <div className="sf-separator mt-3 flex justify-between pt-4"><span className="sf-mono text-xs">Total</span><strong className="sf-tabular text-lg">{total}</strong></div>
    {onDownload && <div className="mt-5"><ActionButton icon={Download} size="small" onClick={onDownload}>Download invoice</ActionButton></div>}
  </SurfaceCard>
}
export function MetricCard({ label, value, detail }: {label:string;value:string;detail?:string}) {
  return <SurfaceCard className="p-5"><p className="sf-mono text-[11px] text-text-secondary">{label}</p><strong className="sf-display sf-tabular mt-2 block text-2xl">{value}</strong>{detail && <p className="mt-1 text-sm text-text-secondary">{detail}</p>}</SurfaceCard>
}
export function ProviderCard({ initials, name, category, location, rating, startingPrice, jobs, onView }: {
  initials:string;name:string;category:string;location:string;rating:string;startingPrice:string;jobs:number;onView:()=>void
}) {
  return <SurfaceCard className="p-5"><div className="flex items-start gap-3"><span className="sf-display flex h-12 w-12 shrink-0 items-center justify-center rounded-docket bg-graphite font-semibold text-white">{initials}</span>
    <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="sf-display font-semibold">{name}</h3><span className="rounded-docket bg-graphite p-1 text-white" role="img" aria-label="Verified provider" title="Verified provider"><ShieldCheck size={15} aria-hidden="true"/></span></div>
      <p className="text-sm text-text-secondary">{category}</p></div></div>
    <div className="mt-4 space-y-1 text-sm text-text-secondary"><p><MapPin size={15} className="mr-2 inline" aria-hidden="true"/>{location}</p><p><span className="text-[#6E5600]" aria-hidden="true">â˜…</span> <span className="sf-tabular">{rating}</span> Â· {jobs} jobs</p></div>
    <div className="sf-separator mt-4 flex items-center justify-between gap-3 pt-4"><span className="sf-tabular text-sm">From {startingPrice}</span><ActionButton variant="stamp" size="small" onClick={onView}>View profile</ActionButton></div>
  </SurfaceCard>
}

export type NavItem = {label:string;href:string;icon:NavIcon;count?:number}
export const roleNav: Record<'client'|'manager'|'employee'|'admin',NavItem[]> = {
  client:[{label:'Dashboard',href:'/client',icon:'dashboard'},{label:'Browse services',href:'/services',icon:'browse'},{label:'Requests',href:'/client/requests',icon:'requests'},{label:'Jobs',href:'/client/jobs',icon:'jobs'},{label:'Invoices',href:'/client/invoices',icon:'invoices'}],
  manager:[{label:'Dashboard',href:'/manager',icon:'dashboard'},{label:'Requests',href:'/manager/requests',icon:'requests'},{label:'Quotations',href:'/manager/quotations',icon:'quotations'},{label:'Jobs',href:'/manager/jobs',icon:'jobs'},{label:'Schedule',href:'/manager/schedule',icon:'schedule'},{label:'Invoices',href:'/manager/invoices',icon:'invoices'},{label:'Flow AI',href:'/manager/ai',icon:'ai'},{label:'Team',href:'/manager/team',icon:'team'}],
  employee:[{label:'Dashboard',href:'/employee',icon:'dashboard'},{label:'Jobs',href:'/employee/jobs',icon:'jobs'},{label:'Schedule',href:'/employee/schedule',icon:'schedule'}],
  admin:[{label:'Dashboard',href:'/admin',icon:'dashboard'},{label:'Company',href:'/admin/companies',icon:'company'},{label:'Settings',href:'/admin/settings',icon:'settings'}]
}
export function AppSidebar({ items, activeHref, userName, subtitle, onNavigate }: {
  items:NavItem[];activeHref:string;userName:string;subtitle:string;onNavigate?:(href:string)=>void
}) {
  const [open,setOpen] = useState(false)
  return <aside className="sf-dark bg-graphite text-white md:w-[248px] md:shrink-0">
    <div className="flex items-center justify-between px-5 py-5"><div className="sf-display flex items-center gap-2.5 font-bold"><span className="sf-mono grid h-8 w-8 place-items-center rounded-docket bg-signal text-xs text-ink">SF</span>ServiceFlow</div>
      <button type="button" className="rounded-docket p-2 md:hidden" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="sf-sidebar-nav" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>}</button></div>
    <nav id="sf-sidebar-nav" aria-label="App navigation" className={cx('px-3 pb-5 md:block',!open && 'hidden')}>
      {items.map(item=>{ const Icon=iconMap[item.icon],active=item.href===activeHref
        return <a key={item.href} href={item.href} aria-current={active?'page':undefined} onClick={e=>{if(onNavigate){e.preventDefault();onNavigate(item.href)}setOpen(false)}}
          className={cx('mb-1 flex min-h-10 items-center gap-3 rounded-docket px-3 text-sm font-medium no-underline hover:bg-graphite-2 hover:text-white',active?'bg-signal font-semibold text-ink hover:bg-signal hover:text-ink':'text-[#C9CDD2]')}>
          <Icon size={19} strokeWidth={2} aria-hidden="true"/>{item.label}{item.count != null && <span className={cx('sf-mono ml-auto rounded-full px-2 text-[11px]',active?'bg-ink text-signal':'bg-[#B93832] text-white')}>{item.count}</span>}
        </a>})}
      <div className="mt-6 flex items-center gap-3 border-t border-dashed border-white/20 px-2 pt-4"><div className="sf-mono grid h-9 w-9 place-items-center rounded-full bg-graphite-2 text-xs text-signal">{userName.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><strong className="block text-sm">{userName}</strong><span className="text-xs text-[#A8ADB3]">{subtitle}</span></div></div>
    </nav>
  </aside>
}

export type Column<T> = {key:string;heading:string;render:(item:T)=>ReactNode}
export function ResponsiveTable<T extends {id:string}>({ columns, rows, caption, empty }: {columns:Column<T>[];rows:T[];caption:string;empty?:ReactNode}) {
  if (!rows.length) return <EmptyState title="No records yet" description="New records will appear here.">{empty}</EmptyState>
  return <><div className="hidden overflow-x-auto sf-card md:block"><table className="w-full border-collapse text-left text-sm"><caption className="sr-only">{caption}</caption><thead className="bg-paper">{<tr>{columns.map(col=><th scope="col" key={col.key} className="sf-mono px-4 py-3 text-[11px] text-text-secondary">{col.heading}</th>)}</tr>}</thead>
    <tbody>{rows.map(row=><tr key={row.id} className="border-t border-line">{columns.map(col=><td key={col.key} className="px-4 py-3 align-top">{col.render(row)}</td>)}</tr>)}</tbody></table></div>
    <div className="space-y-3 md:hidden" role="list" aria-label={caption}>{rows.map(row=><SurfaceCard key={row.id} role="listitem" className="space-y-3 p-4">{columns.map(col=><div key={col.key} className="flex justify-between gap-3"><span className="sf-mono text-[11px] text-text-secondary">{col.heading}</span><span className="text-right text-sm">{col.render(row)}</span></div>)}</SurfaceCard>)}</div></>
}
export function Modal({ open, title, description, children, onClose }: {open:boolean;title:string;description?:string;children:ReactNode;onClose:()=>void}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(()=>{ if (!open) return
    const previous=document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable=()=>Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? [])
    focusable()[0]?.focus()
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRef.current()
      if(event.key==='Tab'){const controls=focusable();if(!controls.length)return
        const first=controls[0],last=controls[controls.length-1]
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
      }}
    document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);previous?.focus()}
  },[open])
  const headingId = useId()
  if(!open)return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#22262B]/45 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={headingId} className="sf-card max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><h2 id={headingId} className="sf-display text-xl font-semibold">{title}</h2><ActionButton variant="icon" icon={X} aria-label="Close dialog" onClick={onClose}/></div>
      {description&&<p className="mt-2 text-sm text-text-secondary">{description}</p>}<div className="mt-5">{children}</div>
    </div>
  </div>
}
export function EmptyState({ title, description, children }: {title:string;description:string;children?:ReactNode}) {
  return <div className="rounded-docket border-2 border-dashed border-border bg-white px-6 py-10 text-center"><ClipboardList className="mx-auto mb-3 text-graphite" size={32} aria-hidden="true"/><h3 className="sf-mono text-xs font-semibold">{title}</h3><p className="mt-2 text-sm text-text-secondary">{description}</p>{children&&<div className="mt-5">{children}</div>}</div>
}
export function Skeleton({ rows=3 }: {rows?:number}) {
  return <div role="status" aria-label="Loading" className="sf-card space-y-3 p-5"><span className="sr-only">Loading</span>{Array.from({length:rows},(_,i)=><div key={i} aria-hidden="true" className="sf-skeleton h-4 rounded-docket" style={{width:i%2?'70%':'95%'}}/>)}</div>
}
export function FlowAIPanel({ question, answer, source, page, loading=false }: {question:string;answer?:string;source?:string;page?:number;loading?:boolean}) {
  return <SurfaceCard className="max-w-xl p-5"><h3 className="sf-display flex items-center gap-2 font-bold"><Sparkles className="text-[#6E5600]" size={18} aria-hidden="true"/>Flow AI</h3>
    <div className="mt-4 flex gap-2 rounded-docket border border-line bg-paper p-3 text-sm"><MessageCircleQuestion className="shrink-0" size={17} aria-hidden="true"/>{question}</div>
    {loading?<div className="mt-4"><Skeleton rows={2}/></div>:<><div className="mt-4 flex gap-2 text-sm"><Sparkles className="shrink-0 text-[#6E5600]" size={17} aria-hidden="true"/><p>{answer ?? 'The uploaded policy document does not provide enough evidence to answer this question.'}</p></div>
    {answer && source && page != null && <div className="sf-mono mt-4 inline-flex items-center gap-2 rounded-docket border border-border px-2 py-1 text-[11px] text-text-secondary"><FileSearch size={15} aria-hidden="true"/>Source: {source} Â· Page {page}</div>}</>}
  </SurfaceCard>
}
export const icons = { Plus,Pencil,Eye,ListFilter,Download,Upload,Ellipsis,Banknote,CalendarDays,Clock3,MapPin,ChevronDown }



===== FILE: src\components\Tabs.tsx =====
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

type Props<T extends string> = {
  label: string
  items: readonly { key: T; label: string }[]
  value: T
  onChange: (value: T) => void
  children: ReactNode
}

export function Tabs<T extends string>({ label, items, value, onChange, children }: Props<T>) {
  const id = useId()
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const selected = list.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!selected || !list.current) return
    const bounds = list.current.getBoundingClientRect()
    const tab = selected.getBoundingClientRect()
    if (tab.left < bounds.left) list.current.scrollLeft -= bounds.left - tab.left
    else if (tab.right > bounds.right) list.current.scrollLeft += tab.right - bounds.right
  }, [value])
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: items.length - 1 - index }
    if (!(event.key in offsets)) return
    event.preventDefault()
    const next = (index + offsets[event.key] + items.length) % items.length
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
    onChange(items[next].key)
  }
  return <>
    <div ref={list} role="tablist" aria-label={label} className="sf-dashboard-tabs">
      {items.map((item, index) => <button
        key={item.key}
        type="button"
        role="tab"
        id={`${id}-${item.key}`}
        aria-selected={value === item.key}
        aria-controls={`${id}-panel`}
        tabIndex={value === item.key ? 0 : -1}
        onKeyDown={event => navigate(event, index)}
        onClick={() => onChange(item.key)}
      >{item.label}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${value}`} tabIndex={0}>
      {children}
    </div>
  </>
}



===== FILE: src\components\ThemeToggle.tsx =====
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return <button type="button" className="sf-theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
  </button>
}



===== FILE: src\features\admin\Catalog.tsx =====
import { useState } from "react";
import { ActionButton, ResponsiveTable, Modal, TextField, TextAreaField, EmptyState } from "../../components";
import { mockServices, type Service } from "../../mocks/data";

export default function AdminCatalog() {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const activeCount = services.filter((s) => s.isActive).length;
  const inactiveCount = services.filter((s) => !s.isActive).length;

  const addService = () => {
    if (!newName.trim()) return;

    const svc: Service = {
      id: `s-${Date.now()}`,
      name: newName.trim(),
      description: newDescription.trim(),
      isActive: true,
    };

    setServices([...services, svc]);
    setNewName("");
    setNewDescription("");
    setAdding(false);
  };

  const toggleService = (svc: Service) => {
    if (svc.isActive && svc.id === "s1") {
      setBlockedReason(
        `${svc.name} is used by active company offerings. Cannot deactivate without manager confirmation.`
      );
      return;
    }

    setServices(services.map((s) => (s.id === svc.id ? { ...s, isActive: !s.isActive } : s)));
    setBlockedReason(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sf-display text-2xl font-bold">Service Catalog</h1>
          <p className="text-sm text-text-secondary mt-1">
            Master list every company picks from when offering services.
          </p>
        </div>
        <ActionButton variant="stamp" onClick={() => setAdding(true)}>
          + Add service
        </ActionButton>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Active</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{activeCount}</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Inactive</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{inactiveCount}</p>
        </div>
      </div>

      {blockedReason && (
        <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
          {blockedReason}
        </div>
      )}

      <ResponsiveTable
        caption="Service catalog"
        rows={services}
        columns={[
          {
            key: "name",
            heading: "Service",
            render: (s) => (
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-text-secondary">{s.description || "No description"}</div>
              </div>
            ),
          },
          {
            key: "status",
            heading: "Status",
            render: (s) => (
              <span className={s.isActive ? "text-sm" : "text-sm text-text-secondary"}>
                {s.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "actions",
            heading: "",
            render: (s) => (
              <ActionButton variant={s.isActive ? "void" : "stub"} size="small" onClick={() => toggleService(s)}>
                {s.isActive ? "Deactivate" : "Reactivate"}
              </ActionButton>
            ),
          },
        ]}
        empty={<EmptyState title="No services yet" description="Add your first service to the catalog." />}
      />

      <Modal
        open={adding}
        title="Add service"
        description="New services appear in every manager's offering picker."
        onClose={() => {
          setAdding(false);
          setNewName("");
          setNewDescription("");
        }}
      >
        <div className="space-y-4">
          <TextField
            label="Service name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <TextAreaField
            label="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <ActionButton
              variant="stub"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewDescription("");
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton variant="stamp" disabled={!newName.trim()} onClick={addService}>
              Add service
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}



===== FILE: src\features\admin\Companies.tsx =====
import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  EmptyState,
  Modal,
  TextAreaField,
} from "../../components";
import { mockCompanies, type Company } from "../../mocks/data";

const companyStatus = (s: "PENDING" | "APPROVED" | "REJECTED"): "awaiting" | "approved" | "declined" => {
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "declined";
  return "awaiting";
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [rejecting, setRejecting] = useState<Company | null>(null);
  const [reason, setReason] = useState("");

  const pendingCount = companies.filter((company) => company.state === "PENDING").length;
  const approvedCount = companies.filter((company) => company.state === "APPROVED").length;
  const rejectedCount = companies.filter((company) => company.state === "REJECTED").length;

  const approve = (id: string) => {
    setCompanies((current) =>
      current.map((company) =>
        company.id === id ? { ...company, state: "APPROVED" } : company,
      ),
    );
  };

  const confirmReject = () => {
    if (!rejecting || !reason.trim()) return;
    setCompanies((current) =>
      current.map((company) =>
        company.id === rejecting.id
          ? { ...company, state: "REJECTED", rejectionReason: reason }
          : company,
      ),
    );
    setRejecting(null);
    setReason("");
  };

  const sorted = [...companies].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
    return order[a.state] - order[b.state];
  });

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Company Approval Queue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Pending</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{pendingCount}</p>
          <p className="text-xs text-text-secondary mt-1">Awaiting review</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Approved</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{approvedCount}</p>
          <p className="text-xs text-text-secondary mt-1">Listed publicly</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Rejected</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{rejectedCount}</p>
          <p className="text-xs text-text-secondary mt-1">Not eligible</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No companies yet" description="New company registrations appear here." />
      ) : (
        <div className="space-y-3">
          {sorted.map((company) => (
            <SurfaceCard key={company.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="sf-display font-semibold text-lg">{company.name}</h3>
                    <StatusBadge status={companyStatus(company.state)} />
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{company.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-text-secondary">Email</p>
                  <p>{company.email}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Phone</p>
                  <p>{company.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Location</p>
                  <p>{company.location}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
                <p className="text-xs text-text-secondary">
                  Registered {formatDate(company.registeredAt)}
                </p>

                {company.state === "PENDING" && (
                  <div className="flex gap-2">
                    <ActionButton variant="stamp" size="small" onClick={() => approve(company.id)}>
                      Approve
                    </ActionButton>
                    <ActionButton
                      variant="void"
                      size="small"
                      onClick={() => {
                        setRejecting(company);
                        setReason("");
                      }}
                    >
                      Reject
                    </ActionButton>
                  </div>
                )}

                {company.state === "APPROVED" && (
                  <span className="text-xs text-text-secondary">âœ“ Listed in marketplace</span>
                )}

                {company.state === "REJECTED" && company.rejectionReason && (
                  <span className="text-xs text-text-secondary">
                    Reason: {company.rejectionReason}
                  </span>
                )}
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      <Modal
        open={!!rejecting}
        title="Reject company"
        description={rejecting ? `Rejecting: ${rejecting.name}` : ""}
        onClose={() => setRejecting(null)}
      >
        <div className="space-y-4">
          <TextAreaField
            label="Reason for rejection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            hint="The manager will see this reason and can resubmit."
          />
          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setRejecting(null)}>
              Cancel
            </ActionButton>
            <ActionButton variant="void" disabled={!reason.trim()} onClick={confirmReject}>
              Reject company
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}



===== FILE: src\features\auth\AccountFlows.tsx =====
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton, SurfaceCard, TextField } from '../../components'
import { Notice, PageHeader } from '../../components/client-shared'
import { destination, useSession } from '../../app/session'
import { demoMode, liveApiMode } from '../../lib/api'
import { demoAccount, requireDemo } from '../../lib/demo-account'
import { clientService } from '../../lib/client-service'

export function EmailVerificationPage() {
  const { user, signIn } = useSession()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const useLive = liveApiMode || !demoMode
  const linkToken = search.get('token') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
  const hasToken = !!linkToken
  if (user && user.email_verified) return <Navigate to={destination(user)} replace />
  if (!user && !hasToken) return <Navigate to="/login" replace />

  async function perform(verify: boolean) {
    if (pending) return
    setPending(true)
    setError('')
    setMessage('')
    try {
      if (useLive) {
        if (verify) {
          await clientService.verifyEmail(linkToken)
          setSearch({})
          window.history.replaceState(null, '', '/verify-email')
          setMessage('Your email has been verified. You can now sign in.')
        } else {
          const address = user ? user.email : email.trim()
          if (!address) throw new Error('Enter the email address you registered with.')
          await clientService.resendVerification(address)
          setMessage('If the account is eligible, a verification email will be sent. Check your inbox.')
        }
      } else {
        requireDemo('Email verification')
        if (verify) {
          const next = demoAccount.redeem(linkToken, 'verify')
          signIn({ access_token: '', user: next })
          navigate(destination(next), { replace: true })
        } else {
          setToken(demoAccount.issueLink(demoAccount.profile().email, 'verify') || '')
        }
      }
    } catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }

  return <div className="mx-auto max-w-xl">
    <PageHeader title="Verify your email" description="Confirm your email address before opening your workspace." />
    <SurfaceCard className="space-y-5 p-6">
      <Notice>{useLive ? 'Verification links expire in 30 minutes and can be used once. Verifying activates a new client account.' : 'Demo verification uses a single-use sample link valid for 15 minutes. No email is sent.'}</Notice>
      {!hasToken && useLive && !user && <TextField label="Email address" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />}
      <ActionButton variant="stamp" disabled={pending} onClick={() => void perform(hasToken)}>
        {pending ? 'Please waitâ€¦' : hasToken ? 'Confirm email verification' : useLive ? 'Resend verification email' : 'Create sample verification link'}
      </ActionButton>
      {token && <Link className="sf-link block" to={`/verify-email?token=${encodeURIComponent(token)}`}>Open sample verification link â†’</Link>}
      {message && <Notice>{message} <Link className="sf-link" to="/login">Sign in</Link></Notice>}
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
  const useLive = liveApiMode || !demoMode
  const token = search.get('token') || new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || ''
  const reset = token !== ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setError('')
    if (reset && password !== confirm) { setError('Passwords must match.'); return }
    setPending(true)
    try {
      if (useLive) {
        if (reset) {
          await clientService.resetPassword(token, password)
          signOut()
          setSearch({})
          window.history.replaceState(null, '', '/password-reset')
          setSampleToken('')
          setPassword('')
          setConfirm('')
          setMessage('Your password has been changed. You can now sign in.')
        } else {
          await clientService.forgotPassword(email.trim())
          setMessage('If an account exists for this email, a password reset email has been sent. Check your inbox.')
        }
      } else {
        requireDemo('Password recovery')
        if (reset) {
          demoAccount.redeem(token, 'reset', password)
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
      }
    } catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }

  return <div className="mx-auto max-w-xl">
    <PageHeader title={reset ? 'Choose a new password' : 'Reset your password'} description="Recover access to your ServiceFlow account." />
    <SurfaceCard className="space-y-5 p-6">
      <Notice>{useLive ? 'A reset link will be emailed to you. Links expire in 30 minutes and can be used once.' : 'Sample recovery links expire in 15 minutes and can be used once. All sample accounts reset on refresh.'}</Notice>
      <form className="space-y-5" onSubmit={submit}>
        {reset ? <>
          <TextField label="New password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={event => setConfirm(event.target.value)} />
        </> : <TextField label="Email address" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />}
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Please waitâ€¦' : reset ? 'Save new password' : 'Request reset link'}</ActionButton>
      </form>
      {sampleToken && <Link className="sf-link block" to={`/password-reset?token=${sampleToken}`}>Open sample password reset link â†’</Link>}
      <Link className="sf-link block" to="/login">Return to sign in â†’</Link>
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
      <ActionButton disabled={pending} onClick={() => void refresh()}>{pending ? 'Checkingâ€¦' : 'Check status'}</ActionButton>
      <Link className="sf-link block" to="/provider-onboarding">View onboarding checklist â†’</Link>
      {user.company_status === 'APPROVED' && <Link className="sf-link block" to="/workspace">Open workspace â†’</Link>}
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
      <Link className="sf-link block" to={user.email_verified === false ? '/verify-email' : '/pending-verification'}>Continue account setup â†’</Link>
      {user.company_status === 'APPROVED' && <Link className="sf-link block" to="/workspace">Continue to manager workspace â†’</Link>}
    </SurfaceCard>
  </div>
}



===== FILE: src\features\auth\AuthPage.tsx =====
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
    <section className="sf-auth-form"><p className="sf-eyebrow">YOUR SERVICEFLOW ACCOUNT</p><h1>{register ? 'Letâ€™s get started' : 'Welcome back'}</h1><p className="sf-auth-description">{register ? 'Create a client account or register your service company.' : 'Sign in to manage your requests and see whatâ€™s next.'}</p>
      <form onSubmit={submit}>{register && <><SelectField label="Account type" value={kind} onChange={event => setKind(event.target.value)}><option value="client">Client â€” request services</option><option value="company">Company â€” provide services</option></SelectField><TextField label={kind === 'company' ? 'Manager name' : 'Full name'} required autoComplete="name" value={name} onChange={event => setName(event.target.value)} error={fields.name} />{kind === 'company' && <TextField label="Company name" required value={company} onChange={event => setCompany(event.target.value)} error={fields.company_name} />}<TextField label="Phone number" type="tel" required autoComplete="tel" minLength={7} maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} error={fields.phone} placeholder="e.g. 077 123 4567" /></>}
        <TextField label="Email address" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} error={fields.email} placeholder="you@example.com" />
        <div className="sf-password-field"><TextField label="Password" type={showPassword ? 'text' : 'password'} required minLength={register ? 8 : 1} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} error={fields.password} hint={register ? 'Use at least 8 characters.' : undefined} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        {error && <Notice error>{error}</Notice>}{success && <Notice>{success} <Link className="sf-link" to="/login">Sign in</Link></Notice>}
        <ActionButton className="w-full" type="submit" variant="stamp" disabled={pending || !!success}>{pending ? 'Please waitâ€¦' : register ? 'Create account' : 'Sign in'}<ArrowRight size={16} /></ActionButton>
      </form>
      {!register && <Link className="sf-link mt-5 inline-block" to="/password-reset">Forgot your password?</Link>}
      <p className="sf-auth-toggle">{register ? 'Already have an account?' : 'New to ServiceFlow?'} <Link to={register ? '/login' : '/register'} state={location.state}>{register ? 'Sign in' : 'Create an account'}</Link></p>
      {demoMode && <div className="sf-demo-login"><strong>Explore before you get started.</strong><p>{register ? 'Demo registration creates a sample session only.' : 'Sample client: nimal@example.com Â· DemoClient123!'}</p><p>Sample data resets on refresh. No real accounts or bookings.</p>{!register && <button type="button" disabled={pending} onClick={() => { setEmail('nimal@example.com'); setPassword('DemoClient123!') }}>Fill sample account<ArrowRight size={14} /></button>}</div>}
    </section>
  </div>
}



===== FILE: src\features\auth\pages.tsx =====
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
  return <><PageHeader title={user.company_status === 'REJECTED' ? 'Application needs attention' : 'Your company is awaiting approval'} description={user.company_status === 'REJECTED' ? 'Review the application with your team. Profile editing and resubmission belong to the manager workspace.' : 'An administrator will review your company before it can appear in the directory.'} /><SurfaceCard className="max-w-2xl space-y-4 p-6"><p>Current status: <strong>{user.company_status || 'PENDING'}</strong></p><ActionButton disabled={pending} onClick={refresh}>{pending ? 'Checkingâ€¦' : 'Check status'}</ActionButton>{error && <Notice error>{error}</Notice>}{user.company_status === 'APPROVED' && <Link className="sf-link block" to="/workspace">Open workspace â†’</Link>}{demoMode && <Notice>This is a sample application. No real company has been submitted.</Notice>}</SurfaceCard></>
}
export function ChangePasswordPage() {
  const { user, signIn } = useSession(); const navigate = useNavigate(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState('')
  if (!user) return <Navigate to="/login" replace />
  async function submit(event: FormEvent) { event.preventDefault(); if (pending) return; if (password !== confirm) { setError('Passwords must match.'); return } setPending(true); setError(''); try { await clientService.changePassword(password); const next = demoMode ? { ...user!, must_change_password: false } : await clientService.me(); signIn({ access_token: '', user: next }); navigate(destination(next)) } catch (e) { setError((e as Error).message) } finally { setPending(false) } }
  return <div className="mx-auto max-w-lg"><PageHeader title="Set your own password" description="Change your temporary password before accessing your workspace." /><SurfaceCard className="p-6"><form className="space-y-5" onSubmit={submit}><TextField label="New password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><TextField label="Confirm new password" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />{error && <Notice error>{error}</Notice>}<ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Savingâ€¦' : 'Save password'}</ActionButton></form></SurfaceCard></div>
}
export function WorkspacePage() { const { user } = useSession(); if (!user) return <Navigate to="/login" replace />; if (destination(user) !== '/workspace') return <Navigate to={destination(user)} replace />; return <><PageHeader title="Your operational workspace" description={`Signed in as ${user.name} (${user.role}).`} /><Notice>The manager, employee and admin screens will connect here when Member 2â€™s workspace is integrated.</Notice></> }



===== FILE: src\features\employee\JobDetail.tsx =====
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionButton, JobTicketCard, Modal, TextAreaField } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

const jobStatus = (s: JobState): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatSlot = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

export default function EmployeeJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const initialJob = mockJobs.find((job) => job.id === jobId);
  const [job, setJob] = useState<Job | undefined>(initialJob);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [notes, setNotes] = useState("");

  if (!job) {
    return <p className="p-6">Job not found</p>;
  }

  const now = new Date();
  const scheduled = job.startTime ? new Date(job.startTime) : null;
  const canStart = job.state === "SCHEDULE_CONFIRMED" && !!scheduled && now >= scheduled;
  const canComplete = job.state === "IN_PROGRESS";

  const start = () => {
    if (!canStart) {
      setError("You cannot start before the scheduled time.");
      return;
    }
    setJob({ ...job, state: "IN_PROGRESS" });
    setError(null);
  };

  const complete = () => {
    if (!canComplete) {
      setError("Start the job first.");
      return;
    }
    setJob({ ...job, state: "COMPLETED" });
    setCompleting(false);
    setError(null);
    setTimeout(() => navigate("/employee/jobs"), 800);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <ActionButton variant="ghost" onClick={() => navigate(-1)}>
        â† Back to jobs
      </ActionButton>

      <JobTicketCard
        id={job.id}
        title={job.serviceName}
        status={jobStatus(job.state)}
        client={job.clientName}
        schedule={formatSlot(job.startTime)}
        employee={job.employeeName ?? "Unassigned"}
      >
        {error && (
          <p className="mb-3 text-sm" style={{ color: "#B93832" }}>
            {error}
          </p>
        )}

        {job.state === "SCHEDULE_CONFIRMED" && (
          <ActionButton
            variant="stamp"
            onClick={start}
            disabled={!canStart}
            title={!canStart ? "Available at scheduled time" : "Start job"}
          >
            {canStart ? "Start job" : "Start (available at scheduled time)"}
          </ActionButton>
        )}

        {job.state === "IN_PROGRESS" && (
          <ActionButton variant="stamp" onClick={() => setCompleting(true)}>
            Complete job
          </ActionButton>
        )}

        {job.state === "COMPLETED" && (
          <p style={{ color: "var(--sf-success)" }}>
            Job completed. Invoice has been issued for the manager to record payment.
          </p>
        )}

        {job.state === "JOB_CREATED" && (
          <p className="text-sm text-text-secondary">
            Waiting for manager to schedule this job.
          </p>
        )}
      </JobTicketCard>

      <Modal
        open={completing}
        title="Complete this job?"
        description="This locks the job and creates an invoice. You cannot undo this."
        onClose={() => setCompleting(false)}
      >
        <div className="space-y-4">
          <TextAreaField
            label="Completion notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setCompleting(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="stamp" onClick={complete}>
              Complete job
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}



===== FILE: src\features\employee\Jobs.tsx =====
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { JobTicketCard, EmptyState } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

type Tab = "today" | "upcoming" | "history";

const jobStatus = (s: JobState): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatSlot = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

const isSameDay = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

export default function EmployeeJobs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("today");

  const myJobs: Job[] = mockJobs.filter((job) => job.employeeId === "e1");
  const now = new Date();

  const todayJobs = myJobs.filter(
    (job) =>
      job.startTime &&
      isSameDay(job.startTime, now) &&
      (job.state === "SCHEDULE_CONFIRMED" || job.state === "IN_PROGRESS" || job.state === "COMPLETED")
  );

  const upcomingJobs = myJobs
    .filter(
      (job) =>
        job.state === "SCHEDULE_CONFIRMED" &&
        job.startTime &&
        new Date(job.startTime) > now &&
        !isSameDay(job.startTime, now)
    )
    .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());

  const historyJobs = myJobs
    .filter((job) => job.state === "COMPLETED")
    .sort((a, b) => new Date(b.startTime ?? 0).getTime() - new Date(a.startTime ?? 0).getTime());

  const buckets: Record<Tab, Job[]> = {
    today: todayJobs,
    upcoming: upcomingJobs,
    history: historyJobs,
  };

  const counts: Record<Tab, number> = {
    today: todayJobs.length,
    upcoming: upcomingJobs.length,
    history: historyJobs.length,
  };

  const list = buckets[tab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">My Day</h1>
        <p className="text-sm text-text-secondary mt-1">Your assigned jobs, grouped by when they happen.</p>
      </div>

      <div className="flex gap-1 border-b border-line">
        {(["today", "upcoming", "history"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={active}
              className={`relative px-4 py-2 text-sm font-medium capitalize transition-colors ${
                active ? "border-b-2 border-graphite text-graphite" : "text-text-secondary hover:text-graphite"
              }`}
            >
              {t}
              {counts[t] > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-graphite text-white" : "bg-paper text-text-secondary"
                  }`}
                >
                  {counts[t]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={`No ${tab} jobs`}
          description={
            tab === "today"
              ? "No jobs scheduled for today."
              : tab === "upcoming"
                ? "No upcoming jobs assigned yet."
                : "Completed jobs will appear here."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((job) => (
            <div key={job.id} onClick={() => navigate(`/employee/jobs/${job.id}`)} style={{ cursor: "pointer" }}>
              <JobTicketCard
                id={job.id}
                title={job.serviceName}
                status={jobStatus(job.state)}
                client={job.clientName}
                schedule={formatSlot(job.startTime)}
                employee={job.employeeName ?? "Unassigned"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



===== FILE: src\features\manager\CompanyProfile.tsx =====
import { useState } from "react";
import {
  ActionButton,
  SurfaceCard,
  TextField,
  TextAreaField,
  SelectField,
  ResponsiveTable,
  EmptyState,
} from "../../components";
import {
  mockCompanyProfile,
  mockOfferedServices,
  mockServices,
  type CompanyProfile,
  type OfferedService,
} from "../../mocks/data";

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>(mockCompanyProfile);
  const [offered, setOffered] = useState<OfferedService[]>(mockOfferedServices);
  const [saved, setSaved] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [newPrice, setNewPrice] = useState("0");

  const saveProfile = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addService = () => {
    const svc = mockServices.find((s) => s.id === selectedServiceId);
    if (!svc) return;
    if (offered.some((o) => o.serviceId === selectedServiceId)) return;

    const price = Number(newPrice) || 0;
    const newOffered: OfferedService = {
      id: `os-${Date.now()}`,
      serviceId: svc.id,
      serviceName: svc.name,
      startingPrice: price,
      isActive: true,
    };

    setOffered([...offered, newOffered]);
    setSelectedServiceId("");
    setNewPrice("0");
    setAddingService(false);
  };

  const updatePrice = (id: string, price: number) => {
    setOffered(offered.map((o) => (o.id === id ? { ...o, startingPrice: price } : o)));
  };

  const removeService = (id: string) => {
    setOffered(offered.filter((o) => o.id !== id));
  };

  const availableServices = mockServices.filter(
    (s) => s.isActive && !offered.some((o) => o.serviceId === s.id)
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="sf-display text-2xl font-bold">Company Profile</h1>

      <SurfaceCard className="p-5 space-y-4">
        <h2 className="font-semibold">Company details</h2>
        <TextField
          label="Company name"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          required
        />
        <TextAreaField
          label="Description"
          value={profile.description}
          onChange={(e) => setProfile({ ...profile, description: e.target.value })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            required
          />
          <TextField
            label="Phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            required
          />
        </div>
        <TextField
          label="Address"
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <ActionButton variant="stamp" onClick={saveProfile}>
            Save details
          </ActionButton>
          {saved && <span className="text-sm text-[var(--sf-success)]">Saved âœ“</span>}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold">Offered services</h2>
            <p className="text-sm text-text-secondary">
              Services your company offers, with starting prices in LKR.
            </p>
          </div>
          <ActionButton
            variant="stub"
            size="small"
            onClick={() => setAddingService(true)}
            disabled={availableServices.length === 0}
          >
            + Offer service
          </ActionButton>
        </div>

        {addingService && (
          <div className="rounded-docket border border-line bg-paper p-3 space-y-3">
            <SelectField
              label="Service"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              required
            >
              <option value="">â€” Select service â€”</option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <TextField
              label="Starting price (LKR)"
              type="number"
              min={0}
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <ActionButton
                variant="stub"
                onClick={() => {
                  setAddingService(false);
                  setSelectedServiceId("");
                  setNewPrice("0");
                }}
              >
                Cancel
              </ActionButton>
              <ActionButton variant="stamp" disabled={!selectedServiceId} onClick={addService}>
                Add service
              </ActionButton>
            </div>
          </div>
        )}

        <ResponsiveTable
          caption="Offered services"
          rows={offered}
          columns={[
            {
              key: "name",
              heading: "Service",
              render: (o) => <span className="font-semibold">{o.serviceName}</span>,
            },
            {
              key: "price",
              heading: "Starting price (LKR)",
              render: (o) => (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={o.startingPrice}
                  onChange={(e) => updatePrice(o.id, Number(e.target.value))}
                  className="sf-input w-32 text-right"
                />
              ),
            },
            {
              key: "actions",
              heading: "",
              render: (o) => (
                <ActionButton variant="void" size="small" onClick={() => removeService(o.id)}>
                  Remove
                </ActionButton>
              ),
            },
          ]}
          empty={
            <EmptyState
              title="No services offered yet"
              description="Add services from the catalog to appear in the marketplace."
            />
          }
        />
      </SurfaceCard>
    </div>
  );
}



===== FILE: src\features\manager\Dashboard.tsx =====
import { useNavigate } from "react-router-dom";
import { ActionButton, SurfaceCard } from "../../components";
import { mockRequests, mockJobs, mockInvoices, mockCompanies } from "../../mocks/data";

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const newRequests = mockRequests.filter((request) => request.state === "NEW").length;
  const scheduledJobs = mockJobs.filter((job) => job.state === "SCHEDULE_CONFIRMED").length;
  const inProgress = mockJobs.filter((job) => job.state === "IN_PROGRESS").length;
  const unpaidInvoices = mockInvoices.filter((invoice) => invoice.state === "UNPAID");
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const pendingCompanies = mockCompanies.filter((company) => company.state === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          BrightFix â€” overview of today's work
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            New requests
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">{newRequests}</p>
          <p className="text-xs text-text-secondary mt-1">
            {newRequests === 0 ? "All caught up" : "Awaiting response"}
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/requests")}>
              View requests â†’
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Scheduled jobs
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">{scheduledJobs}</p>
          <p className="text-xs text-text-secondary mt-1">
            {inProgress} in progress
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/jobs")}>
              View jobs â†’
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Unpaid invoices
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">
            LKR {unpaidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {unpaidInvoices.length} invoice{unpaidInvoices.length === 1 ? "" : "s"}
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/invoices")}>
              View invoices â†’
            </ActionButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Pending companies
          </p>
          <p className="sf-tabular font-semibold text-2xl leading-tight mt-2">{pendingCompanies}</p>
          <p className="text-xs text-text-secondary mt-1">
            Awaiting approval
          </p>
          <div className="mt-3">
            <ActionButton variant="stub" size="small" onClick={() => navigate("/admin/companies")}>
              Review â†’
            </ActionButton>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="stamp" onClick={() => navigate("/manager/requests")}>
            Review requests
          </ActionButton>
          <ActionButton variant="stub" onClick={() => navigate("/manager/jobs")}>
            Schedule a job
          </ActionButton>
          <ActionButton variant="stub" onClick={() => navigate("/manager/schedule")}>
            View schedule
          </ActionButton>
          <ActionButton variant="stub" onClick={() => navigate("/manager/team")}>
            Manage team
          </ActionButton>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">All routes</h2>
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager")}>
            Dashboard
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/requests")}>
            Requests
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/quotations")}>
            Quotations
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/jobs")}>
            Jobs
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/schedule")}>
            Schedule
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/invoices")}>
            Invoices
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/ai")}>
            Flow AI
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/company")}>
            Company
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/manager/team")}>
            Team
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/employee")}> 
            Employee dashboard
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/employee/jobs")}>
            Employee jobs
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/employee/schedule")}>
            Employee schedule
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/admin")}> 
            Admin dashboard
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/admin/companies")}>
            Admin companies
          </ActionButton>
          <ActionButton variant="stub" size="small" onClick={() => navigate("/admin/catalog")}>
            Catalog
          </ActionButton>
        </div>
      </SurfaceCard>
    </div>
  );
}



===== FILE: src\features\manager\Invoices.tsx =====
// src/features/manager/Invoices.tsx
import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  ResponsiveTable,
  Modal,
  SelectField,
  EmptyState,
} from "../../components";
import { mockInvoices, type Invoice } from "../../mocks/data";

const invoiceStatus = (s: "UNPAID" | "PAID"): "unpaid" | "paid" =>
  s === "PAID" ? "paid" : "unpaid";

const formatDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [method, setMethod] = useState("Cash");

  // ---- Computed totals ----
  const unpaidInvoices = invoices.filter((i) => i.state === "UNPAID");
  const paidInvoices = invoices.filter((i) => i.state === "PAID");

  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const paidTotal = paidInvoices.reduce((s, i) => s + i.total, 0);
  const totalBilled = unpaidTotal + paidTotal;

  const unpaidCount = unpaidInvoices.length;
  const paidCount = paidInvoices.length;

  const todayISO = new Date().toISOString().slice(0, 10);
  const paidTodayInvoices = paidInvoices.filter(
    (i) => i.paidAt?.slice(0, 10) === todayISO
  );
  const paidToday = paidTodayInvoices.reduce((s, i) => s + i.total, 0);
  const paidTodayCount = paidTodayInvoices.length;

  // ---- Action ----
  const recordPayment = () => {
    if (!paying) return;
    setInvoices(
      invoices.map((i) =>
        i.id === paying.id
          ? {
              ...i,
              state: "PAID",
              paymentMethod: method,
              paidAt: new Date().toISOString(),
            }
          : i
      )
    );
    setPaying(null);
    setMethod("Cash");
  };

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Invoices</h1>

      {/* Summary strip â€” 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Unpaid total
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {unpaidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {unpaidCount} invoice{unpaidCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Paid total
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {paidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {paidCount} invoice{paidCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Total billed
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {totalBilled.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">
            Collected today
          </p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            LKR {paidToday.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {paidTodayCount} invoice{paidTodayCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Invoice table */}
      <ResponsiveTable
        caption="Invoices"
        rows={invoices}
        columns={[
          {
            key: "number",
            heading: "Invoice #",
            render: (i) => (
              <span className="sf-mono text-xs">{i.invoiceNumber}</span>
            ),
          },
          {
            key: "client",
            heading: "Client",
            render: (i) => (
              <div>
                <div className="font-semibold">{i.clientName}</div>
                <div className="text-xs text-text-secondary">{i.serviceName}</div>
              </div>
            ),
          },
          {
            key: "total",
            heading: "Total (LKR)",
            render: (i) => (
              <span className="sf-tabular font-semibold">
                {i.total.toFixed(2)}
              </span>
            ),
          },
          {
            key: "status",
            heading: "Status",
            render: (i) => <StatusBadge status={invoiceStatus(i.state)} />,
          },
          {
            key: "paid",
            heading: "Payment",
            render: (i) =>
              i.state === "PAID" ? (
                <div className="text-xs">
                  <div className="font-semibold">{i.paymentMethod}</div>
                  <div className="text-text-secondary">
                    {formatDateTime(i.paidAt)}
                  </div>
                </div>
              ) : null,
          },
          {
            key: "actions",
            heading: "",
            render: (i) =>
              i.state === "UNPAID" ? (
                <ActionButton
                  variant="stamp"
                  size="small"
                  onClick={() => {
                    setPaying(i);
                    setMethod("Cash");
                  }}
                >
                  Record payment
                </ActionButton>
              ) : null,
          },
        ]}
        empty={
          <EmptyState
            title="No invoices yet"
            description="Completed jobs create invoices here."
          />
        }
      />

      {/* Record payment modal */}
      <Modal
        open={!!paying}
        title="Record payment"
        description={
          paying
            ? `${paying.invoiceNumber} â€” ${paying.clientName} â€” LKR ${paying.total.toFixed(2)}`
            : ""
        }
        onClose={() => setPaying(null)}
      >
        <div className="space-y-4">
          <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
            <p className="text-text-secondary text-xs">Amount to record</p>
            <p className="sf-tabular font-semibold text-lg">
              LKR {paying?.total.toFixed(2)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Full payment only â€” no partial payments in this release.
            </p>
          </div>

          <SelectField
            label="Payment method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          >
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </SelectField>

          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setPaying(null)}>
              Cancel
            </ActionButton>
            <ActionButton variant="stamp" onClick={recordPayment}>
              Confirm payment
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}


===== FILE: src\features\manager\Jobs.tsx =====
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { JobTicketCard, EmptyState } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

type Tab = "today" | "upcoming" | "history";

const jobStatus = (
  s: JobState
): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatSlot = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

const isSameDay = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

export default function EmployeeJobs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("today");

  // Filter to only this employee's jobs
  const myJobs: Job[] = mockJobs.filter((j) => j.employeeId === "e1");

  const now = new Date();

  const todayJobs = myJobs.filter(
    (j) =>
      j.startTime &&
      isSameDay(j.startTime, now) &&
      (j.state === "SCHEDULE_CONFIRMED" ||
        j.state === "IN_PROGRESS" ||
        j.state === "COMPLETED")
  );

  const upcomingJobs = myJobs
    .filter(
      (j) =>
        j.state === "SCHEDULE_CONFIRMED" &&
        j.startTime &&
        new Date(j.startTime) > now &&
        !isSameDay(j.startTime, now)
    )
    .sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    );

  const historyJobs = myJobs
    .filter((j) => j.state === "COMPLETED")
    .sort(
      (a, b) =>
        new Date(b.startTime ?? 0).getTime() -
        new Date(a.startTime ?? 0).getTime()
    );

  const buckets: Record<Tab, Job[]> = {
    today: todayJobs,
    upcoming: upcomingJobs,
    history: historyJobs,
  };

  const counts: Record<Tab, number> = {
    today: todayJobs.length,
    upcoming: upcomingJobs.length,
    history: historyJobs.length,
  };

  const list = buckets[tab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">My Day</h1>
        <p className="text-sm text-text-secondary mt-1">
          Your assigned jobs, grouped by when they happen.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {(["today", "upcoming", "history"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={active}
              className={`relative px-4 py-2 text-sm font-medium capitalize transition-colors ${
                active
                  ? "border-b-2 border-graphite text-graphite"
                  : "text-text-secondary hover:text-graphite"
              }`}
            >
              {t}
              {counts[t] > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-graphite text-white"
                      : "bg-paper text-text-secondary"
                  }`}
                >
                  {counts[t]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {list.length === 0 ? (
        <EmptyState
          title={`No ${tab} jobs`}
          description={
            tab === "today"
              ? "No jobs scheduled for today."
              : tab === "upcoming"
              ? "No upcoming jobs assigned yet."
              : "Completed jobs will appear here."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/employee/jobs/${job.id}`)}
              style={{ cursor: "pointer" }}
            >
              <JobTicketCard
                id={job.id}
                title={job.serviceName}
                status={jobStatus(job.state)}
                client={job.clientName}
                schedule={formatSlot(job.startTime)}
                employee={job.employeeName ?? "Unassigned"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


===== FILE: src\features\manager\PolicyPage.tsx =====
import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  TextField,
  FlowAIPanel,
  Skeleton,
} from "../../components";
import { mockPolicyStatus, type PolicyStatus, type PolicyState } from "../../mocks/data";
import { Upload } from "lucide-react";

const policyStatus = (s: PolicyState): "awaiting" | "scheduled" | "approved" | "declined" => {
  if (s === "READY") return "approved";
  if (s === "PROCESSING") return "scheduled";
  if (s === "FAILED") return "declined";
  return "awaiting";
};

export default function PolicyPage() {
  const [policy, setPolicy] = useState<PolicyStatus>(mockPolicyStatus);
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<{
    status: "OK" | "INSUFFICIENT_EVIDENCE" | "UNAVAILABLE" | "NO_POLICY";
    answer?: string;
    source?: string;
    page?: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("PDF must be 5 MB or smaller.");
      return;
    }

    setPolicy({
      state: "PROCESSING",
      filename: file.name,
      message: "Uploading and extracting text...",
    });

    setTimeout(() => {
      setPolicy({
        state: "READY",
        activeVersion: (policy.activeVersion ?? 0) + 1,
        filename: file.name,
        uploadedAt: new Date().toISOString().slice(0, 10),
      });
    }, 2000);
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);

    await new Promise((r) => setTimeout(r, 900));

    if (question.toLowerCase().includes("cancel")) {
      setResponse({
        status: "OK",
        answer:
          "Cancellations must be made at least 24 hours before the appointment. Late cancellations incur a 50% service fee.",
        source: "BrightFix Public Policy",
        page: 2,
      });
    } else if (question.toLowerCase().includes("warranty")) {
      setResponse({
        status: "OK",
        answer: "All parts and labour are covered under a 30-day warranty from the date of completion.",
        source: "BrightFix Public Policy",
        page: 3,
      });
    } else if (question.toLowerCase().includes("payment")) {
      setResponse({
        status: "OK",
        answer: "Full payment is recorded after job completion. We accept cash, bank transfer, and cheque.",
        source: "BrightFix Public Policy",
        page: 1,
      });
    } else {
      setResponse({
        status: "INSUFFICIENT_EVIDENCE",
        answer: "The uploaded policy document does not provide enough evidence to answer this question.",
      });
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">Flow AI</h1>
        <p className="text-sm text-text-secondary mt-1">
          Answers questions from this company's public policy document only.
        </p>
      </div>

      <SurfaceCard className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Public policy PDF</h2>
            <p className="text-sm text-text-secondary mt-1">
              One active policy at a time. Uploading a new version keeps the current one active until indexing completes.
            </p>
          </div>
          <StatusBadge status={policyStatus(policy.state)} />
        </div>

        {policy.state === "READY" && (
          <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
            <p>
              <span className="text-text-secondary">File:</span> <strong>{policy.filename}</strong>
            </p>
            <p>
              <span className="text-text-secondary">Version:</span> v{policy.activeVersion}
            </p>
            <p>
              <span className="text-text-secondary">Uploaded:</span> {policy.uploadedAt}
            </p>
          </div>
        )}

        {policy.state === "PROCESSING" && (
          <div className="rounded-docket border border-line bg-paper p-3 text-sm">
            <p className="text-text-secondary">{policy.message}</p>
            <div className="mt-2">
              <Skeleton rows={2} />
            </div>
          </div>
        )}

        {policy.state === "FAILED" && (
          <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
            {policy.message || "Upload failed. Please try again."}
          </div>
        )}

        {uploadError && (
          <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
            {uploadError}
          </div>
        )}

        <label className="inline-flex items-center gap-2 rounded-docket border border-line px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-paper">
          <Upload size={17} aria-hidden="true" />
          {policy.state === "READY" ? "Upload new version" : "Upload PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={policy.state === "PROCESSING"}
          />
        </label>
        <p className="text-xs text-text-secondary">
          Max 5 MB Â· Max 20 pages Â· Text-based PDF only (scanned documents are rejected)
        </p>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">Ask a question</h2>
        <p className="text-sm text-text-secondary">
          Only the policy text is used. The AI cannot see jobs, clients, invoices, or other companies.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <TextField
              label="Your question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is the cancellation policy?"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
            />
          </div>
          <ActionButton
            variant="stamp"
            onClick={ask}
            disabled={loading || !question.trim() || policy.state !== "READY"}
          >
            {loading ? "Thinkingâ€¦" : "Ask"}
          </ActionButton>
        </div>
        {policy.state !== "READY" && (
          <p className="text-xs text-[#6E5600]">
            Upload a policy PDF first â€” the assistant only answers from it.
          </p>
        )}
      </SurfaceCard>

      {(loading || response) && (
        <div>
          <h2 className="font-semibold mb-3">Answer</h2>
          <FlowAIPanel
            question={question}
            answer={
              loading
                ? undefined
                : response?.status === "OK"
                  ? response.answer
                  : response?.status === "INSUFFICIENT_EVIDENCE"
                    ? "The uploaded policy document does not provide enough evidence to answer this question."
                    : response?.status === "UNAVAILABLE"
                      ? "The AI service is temporarily unavailable. You can still book services and manage jobs."
                      : "This company has not uploaded a public policy yet."
            }
            source={response?.status === "OK" ? response.source : undefined}
            page={response?.status === "OK" ? response.page : undefined}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}



===== FILE: src\features\manager\QuoteBuilder.tsx =====
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, UserRound, MapPin, CalendarDays } from "lucide-react";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  TextField,
  DetailRow,
} from "../../components";

type QuotationState = "DRAFT" | "SENT" | "APPROVED" | "DECLINED";

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

import { mockRequests } from "../../mocks/data";

const statusMap = (s: QuotationState): "awaiting" | "approved" | "declined" => {
  if (s === "APPROVED") return "approved";
  if (s === "DECLINED") return "declined";
  return "awaiting";
};

export default function QuoteBuilder() {
  const { requestId } = useParams();
  const navigate = useNavigate();
const req = mockRequests.find(r => r.id === requestId);
  if (!req) {
    return <p>Request not found</p>;
  }

  const [state, setState] = useState<QuotationState>("DRAFT");
  const [items, setItems] = useState<QuotationItem[]>([
    { id: "1", description: req.serviceName, quantity: 1, unitPrice: 0 },
  ]);

  const locked = state !== "DRAFT";

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  const updateItem = (id: string, patch: Partial<QuotationItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  };

  const send = () => {
    const invalid = items.some((item) => item.quantity <= 0 || item.unitPrice < 0);
    if (invalid) {
      alert("Quantity must be > 0 and price â‰¥ 0");
      return;
    }
    if (total <= 0) {
      alert("Add at least one positive line item");
      return;
    }
    setState("SENT");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="sf-display text-2xl font-bold">Quotation â€” {req.clientName}</h1>

      <SurfaceCard className="p-5 space-y-2">
        <StatusBadge status={statusMap(state)} />
        <DetailRow icon={Building2} label="Service">{req.serviceName}</DetailRow>
        <DetailRow icon={UserRound} label="Client">{req.clientName}</DetailRow>
        <DetailRow icon={MapPin} label="Address">{req.address}</DetailRow>
        <DetailRow icon={CalendarDays} label="Preferred date">{req.preferredDate}</DetailRow>
        <p className="text-sm text-text-secondary pt-2">{req.description}</p>
      </SurfaceCard>

      <SurfaceCard className="p-5 space-y-3">
        <h2 className="font-semibold">Line items</h2>

        <table className="w-full text-sm">
          <thead className="bg-paper">
            <tr>
              <th className="sf-mono text-left px-2 py-2 text-[11px] text-text-secondary">Description</th>
              <th className="sf-mono text-left px-2 py-2 text-[11px] text-text-secondary w-24">Qty</th>
              <th className="sf-mono text-left px-2 py-2 text-[11px] text-text-secondary w-40">Unit price (LKR)</th>
              <th className="sf-mono text-right px-2 py-2 text-[11px] text-text-secondary w-32">Line total</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-2 py-2">
                  <input
                    className="sf-input w-full"
                    disabled={locked}
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Describe this line"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={1}
                    className="sf-input w-full"
                    disabled={locked}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="sf-input w-full"
                    disabled={locked}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-2 text-right sf-tabular">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right">
                  {!locked && items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-[#B93832] hover:underline"
                      aria-label="Remove line"
                    >
                      Ã—
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-paper">
              <td colSpan={3} className="px-2 py-3 text-right font-semibold">Total</td>
              <td className="px-2 py-3 text-right font-semibold sf-tabular">{total.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="flex gap-2 pt-2">
          {!locked && (
            <>
              <ActionButton variant="stub" onClick={addItem}>+ Add line</ActionButton>
              <ActionButton variant="stamp" onClick={send}>Send quotation</ActionButton>
            </>
          )}
          {locked && (
            <ActionButton variant="stub" onClick={() => navigate("/manager/requests")}>
              Back to requests
            </ActionButton>
          )}
        </div>

        {locked && (
          <p className="text-xs text-text-secondary">
            Sent quotations cannot be edited. Total locked at LKR {total.toFixed(2)}.
          </p>
        )}
      </SurfaceCard>
    </div>
  );
}



===== FILE: src\features\manager\Requests.tsx =====
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionButton,
  StatusBadge,
  ResponsiveTable,
  Modal,
  TextField,
  EmptyState,
} from "../../components";

import { mockRequests, RequestState, type ServiceRequest } from "../../mocks/data";

const statusMap = (s: RequestState): "awaiting" | "approved" | "declined" | "cancelled" => {
  if (s === "NEW") return "awaiting";
  if (s === "QUOTED") return "awaiting";
  if (s === "REJECTED") return "declined";
  return "cancelled";
};

export default function RequestInbox() {
  const [requests, setRequests] = useState<ServiceRequest[]>(mockRequests);
  const [rejecting, setRejecting] = useState<ServiceRequest | null>(null);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Request Inbox</h1>

      <ResponsiveTable
        caption="Incoming requests"
        rows={requests}
        columns={[
          {
            key: "client",
            heading: "Client",
            render: (r) => (
              <div>
                <div className="font-semibold">{r.clientName}</div>
                <div className="text-xs text-text-secondary">{r.address}</div>
              </div>
            ),
          },
          {
            key: "service",
            heading: "Service",
            render: (r) => (
              <div>
                <div>{r.serviceName}</div>
                <div className="text-xs text-text-secondary">{r.description}</div>
              </div>
            ),
          },
          {
            key: "date",
            heading: "Preferred",
            render: (r) => r.preferredDate,
          },
          {
            key: "status",
            heading: "Status",
            render: (r) => <StatusBadge status={statusMap(r.state)} />,
          },
          {
            key: "actions",
            heading: "Actions",
            render: (r) => {
              if (r.state === "NEW") {
                return (
                  <div className="flex gap-2">
                    <ActionButton
                      variant="stamp"
                      size="small"
                      onClick={() => navigate(`/manager/quotations/${r.id}`)}
                    >
                      Create quote
                    </ActionButton>
                    <ActionButton
                      variant="void"
                      size="small"
                      onClick={() => {
                        setRejecting(r);
                        setReason("");
                      }}
                    >
                      Reject
                    </ActionButton>
                  </div>
                );
              }
              if (r.state === "REJECTED") {
                return <span className="text-xs text-text-secondary">Reason: {r.rejectionReason}</span>;
              }
              return null;
            },
          },
        ]}
        empty={<EmptyState title="No requests yet" description="Requests from clients will appear here." />}
      />

      <Modal
        open={!!rejecting}
        title="Reject request"
        description={rejecting ? `${rejecting.clientName} â€” ${rejecting.serviceName}` : ""}
        onClose={() => setRejecting(null)}
      >
        <div className="space-y-4">
          <TextField
            label="Reason for rejection"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            hint="The client will see this reason."
          />
          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setRejecting(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              variant="void"
              disabled={!reason.trim()}
              onClick={() => {
                if (!rejecting) return;
                setRequests((current) =>
                  current.map((x) =>
                    x.id === rejecting.id ? { ...x, state: "REJECTED", rejectionReason: reason } : x,
                  ),
                );
                setRejecting(null);
                setReason("");
              }}
            >
              Reject request
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}



===== FILE: src\features\manager\Schedule.tsx =====
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton, StatusBadge, SurfaceCard, EmptyState } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

const jobStatus = (s: JobState): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const formatDayHeading = (dateKey: string) => {
  const d = new Date(dateKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateKey);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const dayLabel = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (diff === 0) return `Today Â· ${dayLabel}`;
  if (diff === 1) return `Tomorrow Â· ${dayLabel}`;
  if (diff === -1) return `Yesterday Â· ${dayLabel}`;
  if (diff < 0) return `${dayLabel} (past)`;
  return dayLabel;
};

export default function ManagerSchedule() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  const now = new Date();
  const withSchedule = mockJobs.filter((job) => job.startTime);
  const filtered = withSchedule.filter((job) => {
    if (filter === "all") return true;
    const time = new Date(job.startTime!).getTime();
    if (filter === "upcoming") return time >= now.getTime();
    return time < now.getTime();
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime(),
  );

  const groups: Record<string, Job[]> = {};
  sorted.forEach((job) => {
    const key = new Date(job.startTime!).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  });

  const groupKeys = Object.keys(groups);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="sf-display text-2xl font-bold">Schedule</h1>

        <div className="flex gap-1 border border-line rounded-docket p-1">
          {(["upcoming", "past", "all"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 text-sm rounded-docket capitalize ${
                filter === option ? "bg-graphite text-white" : "hover:bg-paper"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {groupKeys.length === 0 ? (
        <EmptyState
          title={`No ${filter} appointments`}
          description="Scheduled jobs appear here grouped by day."
        />
      ) : (
        <div className="space-y-6">
          {groupKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="sf-display font-semibold text-lg">{formatDayHeading(dateKey)}</h2>
                <span className="sf-mono text-xs text-text-secondary">
                  {groups[dateKey].length} job{groups[dateKey].length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-2">
                {groups[dateKey].map((job) => (
                  <SurfaceCard key={job.id} className="p-4 flex flex-wrap items-center gap-3">
                    <div className="sf-mono text-sm font-semibold min-w-16">
                      {formatTime(job.startTime)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{job.serviceName}</p>
                      <p className="text-sm text-text-secondary">
                        {job.clientName}
                        {job.employeeName && ` Â· ${job.employeeName}`}
                      </p>
                    </div>
                    <StatusBadge status={jobStatus(job.state)} />
                    <ActionButton
                      variant="stub"
                      size="small"
                      onClick={() => navigate("/manager/jobs")}
                    >
                      Open
                    </ActionButton>
                  </SurfaceCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



===== FILE: src\features\manager\Team.tsx =====
import { useState } from "react";
import {
  ActionButton,
  ResponsiveTable,
  Modal,
  TextField,
  EmptyState,
} from "../../components";
import { mockEmployees, type Employee } from "../../mocks/data";

export default function ManagerTeam() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [tempPassword, setTempPassword] = useState<{ name: string; password: string } | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const generatePassword = () =>
    Math.random().toString(36).slice(2, 8).toUpperCase();

  const addEmployee = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    const password = generatePassword();
    const employee: Employee = {
      id: `e-${Date.now()}`,
      fullName: newName.trim(),
      email: newEmail.trim(),
      isActive: true,
      hasActiveJobs: false,
    };

    setEmployees((current) => [...current, employee]);
    setTempPassword({ name: employee.fullName, password });
    setNewName("");
    setNewEmail("");
    setAdding(false);
  };

  const toggleActive = (emp: Employee) => {
    if (emp.isActive && emp.hasActiveJobs) {
      setBlockedReason(
        `${emp.fullName} has proposed, confirmed, or in-progress jobs. Reassign or cancel those before deactivating.`,
      );
      return;
    }
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === emp.id ? { ...employee, isActive: !employee.isActive } : employee,
      ),
    );
    setBlockedReason(null);
  };

  const activeCount = employees.filter((employee) => employee.isActive).length;
  const inactiveCount = employees.filter((employee) => !employee.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="sf-display text-2xl font-bold">Team</h1>
        <ActionButton variant="stamp" onClick={() => setAdding(true)}>
          + Add employee
        </ActionButton>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Active</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{activeCount}</p>
        </div>
        <div className="sf-card p-4 min-w-0 flex flex-col">
          <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Inactive</p>
          <p className="sf-tabular font-semibold text-lg leading-tight mt-1">{inactiveCount}</p>
        </div>
      </div>

      {blockedReason && (
        <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
          {blockedReason}
        </div>
      )}

      <ResponsiveTable
        caption="Employees"
        rows={employees}
        columns={[
          {
            key: "name",
            heading: "Name",
            render: (employee) => (
              <div>
                <div className="font-semibold">{employee.fullName}</div>
                <div className="text-xs text-text-secondary">{employee.email}</div>
              </div>
            ),
          },
          {
            key: "active",
            heading: "Status",
            render: (employee) => (
              <span className={employee.isActive ? "text-sm" : "text-sm text-text-secondary"}>
                {employee.isActive ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "jobs",
            heading: "Jobs",
            render: (employee) =>
              employee.hasActiveJobs ? (
                <span className="text-xs text-[#6E5600]">Has active jobs</span>
              ) : (
                <span className="text-xs text-text-secondary">No active jobs</span>
              ),
          },
          {
            key: "actions",
            heading: "",
            render: (employee) => (
              <ActionButton
                variant={employee.isActive ? "void" : "stub"}
                size="small"
                onClick={() => toggleActive(employee)}
              >
                {employee.isActive ? "Deactivate" : "Reactivate"}
              </ActionButton>
            ),
          },
        ]}
        empty={<EmptyState title="No employees yet" description="Add your first employee." />}
      />

      <Modal
        open={adding}
        title="Add employee"
        description="A temporary password will be generated. Show it to the employee once â€” they must change it at first login."
        onClose={() => {
          setAdding(false);
          setNewName("");
          setNewEmail("");
        }}
      >
        <div className="space-y-4">
          <TextField
            label="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <ActionButton
              variant="stub"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setNewEmail("");
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant="stamp"
              disabled={!newName.trim() || !newEmail.trim()}
              onClick={addEmployee}
            >
              Create employee
            </ActionButton>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!tempPassword}
        title="Temporary password"
        description="This is shown only once. Copy it now."
        onClose={() => setTempPassword(null)}
      >
        {tempPassword && (
          <div className="space-y-4">
            <div className="rounded-docket border border-line bg-paper p-4 space-y-2">
              <p className="text-sm">
                <span className="text-text-secondary">Employee:</span>{" "}
                <strong>{tempPassword.name}</strong>
              </p>
              <p className="text-sm">
                <span className="text-text-secondary">Temp password:</span>{" "}
                <code className="sf-mono text-lg font-bold">{tempPassword.password}</code>
              </p>
            </div>
            <p className="text-xs text-[#6E5600]">
              Give this to the employee. They must change it on first login.
            </p>
            <div className="flex justify-end">
              <ActionButton variant="stamp" onClick={() => setTempPassword(null)}>
                I've saved it
              </ActionButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}



===== FILE: src\lib\api.ts =====
export const demoMode = import.meta.env.VITE_DEMO_MODE !== 'false'
// Enables the routes already available from the shared Tailscale API.
// Remaining workflow routes stay in demo mode until their backend APIs exist.
export const liveApiMode = import.meta.env.VITE_USE_LIVE_API === 'true'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
let accessToken: string | null = null
export function setAccessToken(value: string | null) { accessToken = value }
export class ApiError extends Error {
  constructor(message: string, public status = 400, public fieldErrors: Record<string, string> = {}) { super(message) }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(baseUrl + path, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)
    })
  } catch { throw new ApiError('Cannot reach ServiceFlow. Check your connection and try again.', 0) }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const raw = data?.field_errors ?? {}
    const fields = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)]))
    if (Array.isArray(data?.detail)) {
      for (const issue of data.detail) {
        const key = issue.loc?.filter((part: unknown) => part !== 'body').join('.')
        if (key && typeof issue.msg === 'string') fields[key] = issue.msg
      }
    }
    const message = data?.message || (typeof data?.detail === 'string' ? data.detail : undefined)
      || (response.status === 422 ? 'Please check the highlighted fields.' : 'This action could not be completed. Refresh and try again.')
    throw new ApiError(message, response.status, fields)
  }
  return data as T
}



===== FILE: src\lib\client-feedback.ts =====
import { clientService } from './client-service'
import { demoAccount, requireDemo } from './demo-account'
import { ApiError } from './api'

export type Review = { id: string; client_id: string; company_id: string; job_id: string; author: string; rating: number; comment: string }
export type Dispute = { id: string; client_id: string; record_id: string; kind: 'request' | 'job'; reason: string; status: 'OPEN'; created_at: string }
const reviews: Review[] = []
const disputes: Dispute[] = []

export const clientFeedback = {
  async publicReviews(companyId: string) {
    requireDemo('Public reviews')
    return structuredClone(reviews.filter(review => review.company_id === companyId))
  },
  async reviewForJob(jobId: string) {
    requireDemo('Reviews')
    return structuredClone(reviews.find(review => review.job_id === jobId && review.client_id === demoAccount.id()) || null)
  },
  async review(jobId: string, rating: number, comment: string) {
    requireDemo('Reviews')
    const job = await clientService.job(jobId)
    if (job.status !== 'COMPLETED') throw new ApiError('Only completed jobs can be reviewed.', 409)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.trim().length < 10) throw new ApiError('Choose a rating and enter at least 10 characters.', 422)
    if (await clientFeedback.reviewForJob(jobId)) throw new ApiError('You have already reviewed this job.', 409)
    const request = await clientService.request(job.request_id)
    const review: Review = { id: crypto.randomUUID(), client_id: demoAccount.me().id, company_id: request.company_id, job_id: jobId, author: demoAccount.me().name, rating, comment: comment.trim() }
    reviews.push(review)
    return structuredClone(review)
  },
  async disputes(kind: 'request' | 'job', recordId: string) {
    requireDemo('Disputes')
    return structuredClone(disputes.filter(dispute => dispute.client_id === demoAccount.id() && dispute.kind === kind && dispute.record_id === recordId))
  },
  async dispute(kind: 'request' | 'job', recordId: string, reason: string) {
    requireDemo('Disputes')
    if (kind === 'request') await clientService.request(recordId)
    else await clientService.job(recordId)
    if (reason.trim().length < 10) throw new ApiError('Describe the issue in at least 10 characters.', 422)
    if ((await clientFeedback.disputes(kind, recordId)).length) throw new ApiError('An open dispute already exists for this record.', 409)
    const dispute: Dispute = { id: crypto.randomUUID(), client_id: demoAccount.me().id, record_id: recordId, kind, reason: reason.trim(), status: 'OPEN', created_at: new Date().toISOString() }
    disputes.push(dispute)
    return structuredClone(dispute)
  },
}



===== FILE: src\lib\client-service.ts =====
import { demoAccount, requireDemo } from './demo-account'
import { api, ApiError, demoMode, liveApiMode, setAccessToken } from './api'
import type { Company, Invoice, Job, PolicyAnswer, Quote, RequestInput, RequestRecord, Session, User, Role } from '../types/client'

type BackendUser = Omit<User, 'id' | 'role'> & { id: string | number; role: string }
type ApiProviderSummary = { id: number; name: string; description?: string | null; accepting_requests?: boolean; rating?: number | null; completed_jobs?: number | null; starting_price?: number | null }
type ApiProviderDetail = ApiProviderSummary & { type?: string; email?: string | null; phone?: string | null; address?: string | null; areas?: unknown[]; services?: { id: number; service_id: number; service_name: string; description?: string | null; starting_price: number }[] }
type ApiService = { id: number; name: string; category?: string | null }
type ApiRequest = { id: number; client_id: number; provider_id: number; service_id: number; description: string; preferred_date: string; preferred_time?: string | null; address: string; latitude?: number | null; longitude?: number | null; status: string }
type ApiRequestList = { items: ApiRequest[]; total: number; limit: number; offset: number }
type ApiQuotationItem = { description: string; quantity: number | string; unit_price: number | string }
type ApiQuotation = { id: number; request_id: number; status: string; total_amount: number | string; items: ApiQuotationItem[] }
function normalizeUser(value: BackendUser): User {
  const roles: Record<string, Role> = { CLIENT: 'client', COMPANY_MANAGER: 'manager', EMPLOYEE: 'employee', SYSTEM_ADMIN: 'admin', client: 'client', manager: 'manager', employee: 'employee', admin: 'admin' }
  const role = roles[value.role]
  if (!role) throw new ApiError('This account role is not supported by the current release.', 403)
  return { ...value, id: String(value.id), role }
}

function providerSummary(value: ApiProviderSummary): Company {
  return {
    id: String(value.id), name: value.name, category: 'Service provider', location: 'Service area available on profile',
    description: value.description || 'This provider has not added a public description yet.', phone: '', email: '',
    offerings: [], completed_jobs: value.completed_jobs ?? 0,
  }
}

function providerDetail(value: ApiProviderDetail): Company {
  const areas = (value.areas || []).map(area => typeof area === 'string' ? area : '').filter(Boolean)
  return {
    ...providerSummary(value), location: value.address || areas.join(', ') || 'Service area available on request',
    phone: value.phone || '', email: value.email || '',
    focus_areas: areas,
    offerings: (value.services || []).map(service => ({
      id: String(service.service_id), name: service.service_name, starting_price: Number(service.starting_price), active: true,
    })),
  }
}

function requestRecord(value: ApiRequest, providers: Map<number, ApiProviderSummary>, services: Map<number, ApiService>): RequestRecord {
  const provider = providers.get(value.provider_id)
  const service = services.get(value.service_id)
  return {
    id: String(value.id), client_id: String(value.client_id), company_id: String(value.provider_id),
    company_name: provider?.name || 'Service provider', service: service?.name || 'Requested service',
    description: value.description, address: value.address, preferred_date: value.preferred_date,
    preferred_time: value.preferred_time || undefined, latitude: value.latitude ?? undefined, longitude: value.longitude ?? undefined,
    status: value.status as RequestRecord['status'],
  }
}

function normalizeQuote(value: ApiQuotation, record?: RequestRecord): Quote {
  return {
    id: String(value.id), request_id: String(value.request_id),
    company_name: record?.company_name || 'Service provider', service: record?.service || 'Requested service',
    status: value.status as Quote['status'],
    items: (value.items || []).map(item => ({ description: item.description, quantity: Number(item.quantity), unit_price: Number(item.unit_price) })),
    total: Number(value.total_amount),
  }
}

async function requestReferences() {
  const [providers, services] = await Promise.all([
    api<ApiProviderSummary[]>('/providers?provider_type=COMPANY&limit=100'),
    api<ApiService[]>('/services'),
  ])
  return { providers: new Map(providers.map(provider => [provider.id, provider])), services: new Map(services.map(service => [service.id, service])) }
}

const companies: Company[] = [
  { id: 'brightfix', name: 'BrightFix', category: 'Electrical & maintenance', location: 'Colombo', description: 'Practical help for the spaces you depend on. Book electrical inspections and everyday maintenance with our company team.', phone: '+94 11 234 5678', email: 'hello@example.com', offerings: [{ id: 'inspection', name: 'Basic inspection', starting_price: 3000, active: true }, { id: 'electrical', name: 'Electrical maintenance', starting_price: 4500, active: true }] },
  { id: 'clearwater', name: 'ClearWater Services', category: 'Plumbing', location: 'Nugegoda', description: 'Plumbing inspections, leak assessment and household maintenance.', phone: '+94 11 234 5679', email: 'water@example.com', offerings: [{ id: 'plumbing', name: 'Plumbing inspection', starting_price: 2500, active: true }] },
  { id: 'coolworks', name: 'CoolWorks', category: 'Air conditioning', location: 'Dehiwala', description: 'Air conditioning servicing and cooling system inspections for your home.', phone: '+94 11 234 5680', email: 'cool@example.com', offerings: [{ id: 'ac', name: 'AC servicing', starting_price: 5000, active: true }] }
]
const nextSlot = () => {
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 2)
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1)
  return `${date.toISOString().slice(0, 10)}T10:00:00+05:30`
}
const sampleItems = [{ description: 'Inspection service', quantity: 1, unit_price: 2500 }, { description: 'Call-out', quantity: 1, unit_price: 500 }]
const requests: RequestRecord[] = [
  { id: 'SF-REQ-1001', client_id: 'demo-client', company_id: 'brightfix', company_name: 'BrightFix', service: 'Basic inspection', description: 'Please inspect an intermittent power issue in the kitchen.', address: '24 Lake Road, Colombo', preferred_date: nextSlot().slice(0, 10), status: 'QUOTED', quotation_id: 'SF-QUO-1001' },
  { id: 'SF-REQ-1002', client_id: 'demo-client', company_id: 'brightfix', company_name: 'BrightFix', service: 'Basic inspection', description: 'Check the living room electrical outlets.', address: '24 Lake Road, Colombo', preferred_date: nextSlot().slice(0, 10), status: 'CONVERTED', quotation_id: 'SF-QUO-1002' },
  { id: 'SF-REQ-1003', client_id: 'demo-client', company_id: 'brightfix', company_name: 'BrightFix', service: 'Basic inspection', description: 'Completed sample inspection.', address: '24 Lake Road, Colombo', preferred_date: '2026-10-20', status: 'CONVERTED', quotation_id: 'SF-QUO-1003' }
]
const quotes: Quote[] = requests.map((r, i) => ({ id: r.quotation_id!, request_id: r.id, company_name: r.company_name, service: r.service, status: i ? 'APPROVED' : 'SENT', items: sampleItems.map(item => ({ ...item })), total: 3000 }))
const jobs: Job[] = [
  { id: 'SF-JOB-1002', request_id: requests[1].id, company_name: 'BrightFix', service: 'Basic inspection', status: 'SCHEDULE_PROPOSED', appointment: nextSlot(), address: requests[1].address },
  { id: 'SF-JOB-1003', request_id: requests[2].id, company_name: 'BrightFix', service: 'Basic inspection', status: 'COMPLETED', appointment: '2026-10-20T10:00:00+05:30', address: requests[2].address }
]
const invoices: Invoice[] = [{ id: 'SF-INV-1003', job_id: 'SF-JOB-1003', company_name: 'BrightFix', service: 'Basic inspection', total: 3000, status: 'PAID', items: sampleItems }]
const wait = () => new Promise(resolve => setTimeout(resolve, 250))
function find<T extends { id: string }>(rows: T[], id: string): T {
  const row = rows.find(value => value.id === id)
  if (!row) throw new ApiError('This record is unavailable or you do not have access to it.', 404)
  return row
}
const copy = <T,>(value: T): T => structuredClone(value)
function publicCompany(company: Company): Company {
  const companyRequests = requests.filter(request => request.company_id === company.id)
  return {
    ...company,
    focus_areas: company.offerings.filter(offering => offering.active).map(offering => offering.name),
    completed_jobs: jobs.filter(job => job.status === 'COMPLETED' && companyRequests.some(request => request.id === job.request_id)).length,
  }
}
export const clientService = {
  async companies(): Promise<Company[]> {
    if (liveApiMode) {
      const records = await api<ApiProviderSummary[]>('/providers?provider_type=COMPANY&limit=100')
      return records.map(providerSummary)
    }
    if (!demoMode) return api('/companies')
    await wait(); return copy(companies.map(publicCompany))
  },
  async company(id: string): Promise<Company> {
    if (liveApiMode) return providerDetail(await api<ApiProviderDetail>(`/providers/${encodeURIComponent(id)}`))
    if (!demoMode) return api(`/companies/${encodeURIComponent(id)}`)
    await wait(); return copy(publicCompany(find(companies, id)))
  },
  async login(email: string, password: string): Promise<Session> {
    if (liveApiMode || !demoMode) {
      const result = await api<{ access_token: string; user?: BackendUser }>('/auth/login', 'POST', { email, password })
      setAccessToken(result.access_token)
      try { return { access_token: result.access_token, user: result.user ? normalizeUser(result.user) : await clientService.me() } }
      catch (cause) { setAccessToken(null); throw cause }
    }
    await wait()
    return demoAccount.login(email, password)
  },
  async register(kind: string, body: Record<string, string>): Promise<Session | null> {
    if (liveApiMode) {
      const payload = kind === 'client' ? body : {
        provider_name: body.company_name, provider_email: body.email, provider_phone: body.phone,
        name: body.name, email: body.email, phone: body.phone, password: body.password,
      }
      await api(kind === 'client' ? '/auth/register' : '/auth/register/company', 'POST', payload)
      return null
    }
    if (!demoMode) { if (kind !== 'client') requireDemo('Company registration'); await api(kind === 'client' ? '/auth/register' : '/auth/register/company', 'POST', body); return null }
    await wait()
    return demoAccount.register(kind, body)
  },
  async changePassword(password: string, currentPassword?: string) {
    if (liveApiMode) {
      if (!currentPassword) throw new ApiError('Enter your current password before choosing a new password.', 422)
      return api('/auth/change-password', 'POST', { current_password: currentPassword, new_password: password })
    }
    if (!demoMode) return api('/auth/change-password', 'POST', { new_password: password }); await wait(); demoAccount.changePassword(password)
  },
  async forgotPassword(email: string) {
    if (liveApiMode || !demoMode) return api('/auth/forgot-password', 'POST', { email })
    await wait()
  },
  async resetPassword(token: string, newPassword: string) {
    if (liveApiMode || !demoMode) return api('/auth/reset-password', 'POST', { token, new_password: newPassword })
    await wait()
  },
  async verifyEmail(token: string) {
    if (liveApiMode || !demoMode) return api('/auth/verify-email', 'POST', { token })
    await wait()
  },
  async resendVerification(email: string) {
    if (liveApiMode || !demoMode) return api('/auth/resend-verification', 'POST', { email })
    await wait()
  },
  async me(): Promise<User> { return liveApiMode || !demoMode ? normalizeUser(await api<BackendUser>('/auth/me')) : demoAccount.me() },
  async requests(): Promise<RequestRecord[]> {
    if (liveApiMode) {
      const [records, references] = await Promise.all([api<ApiRequestList>('/requests?limit=100'), requestReferences()])
      return records.items.map(record => requestRecord(record, references.providers, references.services))
    }
    if (!demoMode) return api('/requests'); await wait(); return copy(requests.filter(row => row.client_id === demoAccount.id()))
  },
  async request(id: string): Promise<RequestRecord> {
    if (liveApiMode) {
      const [record, references] = await Promise.all([api<ApiRequest>(`/requests/${encodeURIComponent(id)}`), requestReferences()])
      return requestRecord(record, references.providers, references.services)
    }
    if (!demoMode) return api(`/requests/${encodeURIComponent(id)}`); await wait(); return copy(find(requests.filter(row => row.client_id === demoAccount.id()), id))
  },
  async createRequest(input: RequestInput): Promise<RequestRecord> {
    if (liveApiMode) {
      if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) throw new ApiError('Choose or enter the service location before sending this request.', 422)
      const saved = await api<ApiRequest>('/requests', 'POST', {
        provider_id: Number(input.company_id), service_id: Number(input.company_service_id), description: input.description,
        preferred_date: input.preferred_date, preferred_time: input.preferred_time || null, address: input.address,
        latitude: input.latitude, longitude: input.longitude,
      })
      const references = await requestReferences()
      return requestRecord(saved, references.providers, references.services)
    }
    if (!demoMode) return api('/requests', 'POST', input)
    await wait(); const company = find(companies, input.company_id); const offer = find(company.offerings, input.company_service_id)
    const row: RequestRecord = { id: `SF-REQ-${Date.now()}`, client_id: demoAccount.me().id, company_id: company.id, company_name: company.name, service: offer.name, description: input.description, address: input.address, preferred_date: input.preferred_date, preferred_time: input.preferred_time, latitude: input.latitude, longitude: input.longitude, photos: input.photos, status: 'NEW' }
    requests.unshift(row); return copy(row)
  },
  async cancelRequest(id: string, reason: string) {
    if (liveApiMode || !demoMode) return api(`/requests/${encodeURIComponent(id)}/cancel`, 'POST', { reason })
    await wait(); const row = find(requests.filter(row => row.client_id === demoAccount.id()), id)
    if (!['NEW', 'QUOTED'].includes(row.status)) throw new ApiError('This request can no longer be cancelled. Refresh to see its current state.', 409)
    row.status = 'CANCELLED'; if (row.quotation_id) find(quotes, row.quotation_id).status = 'CANCELLED'
  },
  async quotes(): Promise<Quote[]> {
    if (liveApiMode || !demoMode) { const records = await clientService.requests(); const ids = [...new Set(records.flatMap(r => r.quotation_id ? [r.quotation_id] : []))]; return Promise.all(ids.map(id => clientService.quote(id))) }
    await wait(); return copy(quotes.filter(row => requests.some(request => request.id === row.request_id && request.client_id === demoAccount.id())))
  },
  async quote(id: string): Promise<Quote> {
    if (liveApiMode || !demoMode) {
      const value = await api<ApiQuotation>(`/quotations/${encodeURIComponent(id)}`)
      const record = await clientService.request(String(value.request_id)).catch(() => undefined)
      return normalizeQuote(value, record)
    }
    await wait(); return copy(find(await clientService.quotes(), id))
  },
  async decideQuote(id: string, decision: 'approve' | 'decline') {
    if (liveApiMode || !demoMode) return api(`/quotations/${encodeURIComponent(id)}/${decision}`, 'POST')
    await wait(); const row = find(quotes, (await clientService.quote(id)).id)
    if (row.status !== 'SENT') throw new ApiError('This quotation is no longer awaiting a decision.', 409)
    const request = find(requests, row.request_id)
    if (decision === 'approve') {
      row.status = 'APPROVED'; request.status = 'CONVERTED'
      jobs.unshift({ id: `SF-JOB-${Date.now()}`, request_id: request.id, company_name: row.company_name, service: row.service, status: 'JOB_CREATED', address: request.address })
    } else { row.status = 'DECLINED'; request.status = 'DECLINED' }
  },
  async jobs(): Promise<Job[]> { if (!demoMode) return api('/jobs'); await wait(); return copy(jobs.filter(row => requests.some(request => request.id === row.request_id && request.client_id === demoAccount.id()))) },
  async job(id: string): Promise<Job> { if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}`); await wait(); return copy(find(await clientService.jobs(), id)) },
  async decideSchedule(id: string, decision: 'approve' | 'decline') {
    if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}/schedule/${decision}`, 'POST')
    await wait(); const row = find(jobs, (await clientService.job(id)).id)
    if (row.status !== 'SCHEDULE_PROPOSED') throw new ApiError('The appointment has changed. Refresh before deciding.', 409)
    row.status = decision === 'approve' ? 'SCHEDULE_CONFIRMED' : 'JOB_CREATED'
    if (decision === 'decline') delete row.appointment
  },
  async cancelJob(id: string, reason: string) {
    if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}/cancel`, 'POST', { reason })
    await wait(); const row = find(jobs, (await clientService.job(id)).id)
    if (!['JOB_CREATED', 'SCHEDULE_PROPOSED', 'SCHEDULE_CONFIRMED'].includes(row.status)) throw new ApiError('Cancellation is only available before work starts.', 409)
    row.status = 'CANCELLED'; delete row.appointment
  },
  async invoices(): Promise<Invoice[]> { if (!demoMode) return api('/invoices'); await wait(); const ownedJobs = await clientService.jobs(); return copy(invoices.filter(row => ownedJobs.some(job => job.id === row.job_id))) },
  async invoice(id: string): Promise<Invoice> { if (!demoMode) return api(`/invoices/${encodeURIComponent(id)}`); await wait(); return copy(find(await clientService.invoices(), id)) },
  async policy(companyId: string): Promise<{ title: string; url: string } | null> { if (!demoMode) return api(`/companies/${encodeURIComponent(companyId)}/policy`); await wait(); return null },
  async ask(companyId: string, question: string): Promise<PolicyAnswer> {
    if (!demoMode) return api('/ai/ask-docs', 'POST', { company_id: companyId, question })
    await wait(); return { status: 'NO_POLICY', answer: 'No public policy is available for this sample company. Answers will appear when a company policy is connected.', citations: [] }
  }
}



===== FILE: src\lib\demo-account.ts =====
import { ApiError, demoMode } from './api'
import type { Session, User } from '../types/client'

type Account = { user: User; email: string; phone: string; password: string }
const accounts = new Map<string, Account>([
  ['nimal@example.com', {
    user: { id: 'demo-client', name: 'Nimal Fernando', role: 'client', email_verified: true },
    email: 'nimal@example.com', phone: '0771234567', password: 'DemoClient123!',
  }],
])
let active: Account | undefined
const links = new Map<string, { email: string; purpose: 'verify' | 'reset'; expires: number }>()

export function requireDemo(feature: string) {
  if (!demoMode) {
    throw new ApiError(`${feature} is awaiting an agreed backend API. This action is available in the sample demo only.`, 501)
  }
}

function session(account: Account): Session {
  active = account
  return { access_token: 'demo-only', user: structuredClone(account.user) }
}

export const demoAccount = {
  id: () => active?.user.id,
  logout: () => { active = undefined },
  login(email: string, password: string) {
    const account = accounts.get(email.toLowerCase())
    if (!account || account.password !== password) throw new ApiError('Invalid email or password.', 401)
    return session(account)
  },
  register(kind: string, body: Record<string, string>) {
    const email = body.email.toLowerCase()
    if (accounts.has(email)) throw new ApiError('An account with this email already exists.', 409, { email: 'Choose another email or sign in.' })
    const account: Account = {
      email, phone: body.phone, password: body.password,
      user: {
        id: crypto.randomUUID(), name: body.name, role: kind === 'company' ? 'manager' : 'client',
        email_verified: false,
        ...(kind === 'company' ? { company_status: 'PENDING' as const, company_name: body.company_name } : {}),
      },
    }
    accounts.set(email, account)
    return session(account)
  },
  me() {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    return structuredClone(active.user)
  },
  profile() {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    return { name: active.user.name, email: active.email, phone: active.phone }
  },
  updateProfile(name: string, phone: string) {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    active.user.name = name
    active.phone = phone
    return structuredClone(active.user)
  },
  changePassword(password: string) {
    if (!active) throw new ApiError('Sign in to continue.', 401)
    active.password = password
    active.user.must_change_password = false
  },
  issueLink(email: string, purpose: 'verify' | 'reset') {
    requireDemo(purpose === 'verify' ? 'Email verification' : 'Password recovery')
    const normalized = email.toLowerCase()
    if (!accounts.has(normalized)) return null
    if (purpose === 'verify' && active?.email !== normalized) throw new ApiError('Sign in to verify your account.', 403)
    const token = crypto.randomUUID()
    links.set(token, { email: normalized, purpose, expires: Date.now() + 15 * 60 * 1000 })
    return token
  },
  redeem(token: string, purpose: 'verify' | 'reset', password?: string) {
    requireDemo(purpose === 'verify' ? 'Email verification' : 'Password recovery')
    const link = links.get(token)
    if (!link || link.purpose !== purpose || link.expires < Date.now()) throw new ApiError('This link is invalid or expired. Request a new link.', 400)
    const account = accounts.get(link.email)!
    if (purpose === 'verify') {
      if (active !== account) throw new ApiError('Sign in to the account that requested this link.', 403)
      account.user.email_verified = true
    } else {
      if (!password || password.length < 8) throw new ApiError('Use at least 8 characters.', 422)
      account.password = password
    }
    links.delete(token)
    return structuredClone(account.user)
  },
}



===== FILE: src\lib\statusMap.ts =====
import type { WorkflowStatus } from "../components";

export type RequestState = "NEW" | "QUOTED" | "CONVERTED" | "REJECTED" | "CANCELLED" | "DECLINED";
export type QuotationState = "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "CANCELLED";
export type JobState = "JOB_CREATED" | "SCHEDULE_PROPOSED" | "SCHEDULE_CONFIRMED" | "IN_PROGRESS" | "COMPLETED";
export type InvoiceState = "UNPAID" | "PAID";
export type CompanyState = "PENDING" | "APPROVED" | "REJECTED";

export const requestStatus = (s: RequestState): WorkflowStatus =>
  s === "NEW" ? "awaiting" :
  s === "QUOTED" ? "awaiting" :
  s === "CONVERTED" ? "approved" :
  s === "REJECTED" ? "declined" :
  s === "DECLINED" ? "declined" : "cancelled";

export const quotationStatus = (s: QuotationState): WorkflowStatus =>
  s === "APPROVED" ? "approved" :
  s === "DECLINED" ? "declined" :
  s === "CANCELLED" ? "cancelled" : "awaiting";

export const jobStatus = (s: JobState): WorkflowStatus =>
  s === "JOB_CREATED" ? "awaiting" :
  s === "SCHEDULE_PROPOSED" ? "awaiting" :
  s === "SCHEDULE_CONFIRMED" ? "scheduled" :
  s === "IN_PROGRESS" ? "in_progress" : "completed";

export const invoiceStatus = (s: InvoiceState): WorkflowStatus =>
  s === "PAID" ? "paid" : "unpaid";

export const companyStatus = (s: CompanyState): WorkflowStatus =>
  s === "PENDING" ? "awaiting" :
  s === "APPROVED" ? "approved" : "declined";


===== FILE: src\lib\theme.ts =====
import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'sf-theme'

function resolveStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function resolvePreferredTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function resolveTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return resolveStoredTheme() ?? resolvePreferredTheme()
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function initTheme(): Theme {
  const theme = resolveTheme()
  applyTheme(theme)
  return theme
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => initTheme())
  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      return
    }
  }, [theme])
  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(() => setThemeState(current => (current === 'light' ? 'dark' : 'light')), [])
  return createElement(ThemeContext.Provider, { value: { theme, setTheme, toggleTheme } }, children)
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}



===== FILE: src\types\client.ts =====
export type Role = 'client' | 'manager' | 'employee' | 'admin'
export type User = { id: string; name: string; role: Role; email?: string; phone?: string; email_verified?: boolean; company_name?: string; company_status?: 'PENDING' | 'REJECTED' | 'APPROVED'; must_change_password?: boolean }
export type Offering = { id: string; name: string; starting_price: number; active: boolean }
export type Company = { id: string; name: string; category: string; location: string; description: string; phone: string; email: string; offerings: Offering[]; focus_areas?: string[]; completed_jobs?: number }
export type RequestRecord = { id: string; client_id: string; company_id: string; company_name: string; service: string; description: string; address: string; preferred_date: string; status: 'NEW' | 'QUOTED' | 'CONVERTED' | 'CANCELLED' | 'DECLINED' | 'REJECTED'; quotation_id?: string; preferred_time?: string; latitude?: number; longitude?: number; photos?: { name: string; type: string; data_url: string }[] }
export type Quote = { id: string; request_id: string; company_name: string; service: string; status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED'; items: { description: string; quantity: number; unit_price: number }[]; total: number }
export type Job = { id: string; request_id: string; company_name: string; service: string; status: 'JOB_CREATED' | 'SCHEDULE_PROPOSED' | 'SCHEDULE_CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; appointment?: string; address: string }
export type Invoice = { id: string; job_id: string; company_name: string; service: string; total: number; status: 'UNPAID' | 'PAID'; items: Quote['items'] }
export type PolicyAnswer = { status: 'ANSWERED' | 'NO_POLICY' | 'INSUFFICIENT_EVIDENCE' | 'UNAVAILABLE'; answer: string; citations: { policy_id: string; policy_version: string; title: string; page: number; url: string }[] }
export type Session = { access_token: string; user: User }
export type RequestInput = { company_id: string; company_service_id: string; description: string; address: string; preferred_date: string; preferred_time?: string; latitude?: number; longitude?: number; photos?: { name: string; type: string; data_url: string }[] }



===== FILE: src\App.tsx =====
import { useState, type ReactNode } from "react";
import { useSession } from "./app/session";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ActionButton,
  AppSidebar,
  EmptyState,
  Modal,
  roleNav,
  SelectField,
  Skeleton,
  StatusBadge,
  SurfaceCard,
  TextField,
} from "./components";
import { Notice, PageHeader } from "./components/client-shared";
import { ClientShell } from "./components/layout/ClientShell";
import { ClientGuard, SessionProvider } from "./app/session";
import { DirectoryPage } from "./features/marketplace/DirectoryPage";
import { LandingPage } from "./features/marketplace/LandingPage";
import { CompanyPage } from "./features/marketplace/pages";
import { AuthPage } from "./features/auth/AuthPage";
import { ChangePasswordPage, WorkspacePage } from "./features/auth/pages";
import {
  EmailVerificationPage,
  PasswordResetPage,
  PendingVerificationPage,
  ProviderOnboardingPage,
} from "./features/auth/AccountFlows";
import {
  ClientDashboardPage,
  LegacyClientRoute,
  RequestEntryRoute,
} from "./features/client/ClientDashboardPage";
import { SharedExamples } from "./features/client/SharedExamples";
import ManagerDashboard from "./features/manager/Dashboard";
import RequestInbox from "./features/manager/Requests";
import QuoteBuilder from "./features/manager/QuoteBuilder";
import ManagerJobs from "./features/manager/Jobs";
import ManagerSchedule from "./features/manager/Schedule";
import Invoices from "./features/manager/Invoices";
import ManagerTeam from "./features/manager/Team";
import PolicyPage from "./features/manager/PolicyPage";
import CompanyProfilePage from "./features/manager/CompanyProfile";
import EmployeeJobs from "./features/employee/Jobs";
import EmployeeJobDetail from "./features/employee/JobDetail";
import AdminCompanies from "./features/admin/Companies";
import AdminCatalog from "./features/admin/Catalog";
import "./styles/client.css";

type Role = "manager" | "employee" | "admin";

const EmployeeHome = () => <h1>EmployeeHome</h1>;

const EmployeeSchedule = () => <h1>EmployeeSchedule</h1>;
const AdminHome = () => <h1>AdminHome</h1>;

const AdminSettings = () => <h1>AdminSettings</h1>;

function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const items = roleNav[role];

  const activeHref = items.reduce<string>((current, item) => {
    const isExactMatch = location.pathname === item.href;
    const isNestedMatch = item.href !== "/" && location.pathname.startsWith(`${item.href}/`);
    if (isExactMatch || isNestedMatch) {
      return item.href.length > current.length ? item.href : current;
    }
    return current;
  }, items[0]?.href ?? "/");

  const subtitleMap: Record<Role, string> = {
    manager: "Manager Â· BrightFix",
    employee: "Employee Â· BrightFix",
    admin: "Admin Â· BrightFix",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar
        items={items}
        activeHref={activeHref}
        userName={user?.name ?? "Amizka"}
        subtitle={subtitleMap[role]}
        onNavigate={(href) => navigate(href)}
      />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}

export default function App() {
  return <BrowserRouter>
    <SessionProvider>
      <Routes>
        <Route element={<ClientShell />}>
          <Route index element={<LandingPage />} />
          <Route path="services" element={<DirectoryPage />} />
          <Route path="companies" element={<DirectoryPage />} />
          <Route path="companies/:id" element={<CompanyRoute />} />
          <Route path="companies/:id/request" element={<ClientGuard><RequestEntryRoute /></ClientGuard>} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage register />} />
          <Route path="verify-email" element={<EmailVerificationPage />} />
          <Route path="pending-verification" element={<PendingVerificationPage />} />
          <Route path="account-status" element={<PendingVerificationPage />} />
          <Route path="password-reset" element={<PasswordResetPage />} />
          <Route path="provider-onboarding" element={<ProviderOnboardingPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="style-guide" element={<StyleGuidePage />} />
          <Route path="client" element={<ClientGuard><ClientDashboardPage /></ClientGuard>} />
          {(['requests', 'quotations', 'jobs', 'invoices', 'profile'] as const).map(tab => (
            <Route key={tab} path={`client/${tab}`} element={<ClientGuard><LegacyClientRoute tab={tab} /></ClientGuard>} />
          ))}
          {(['requests', 'quotations', 'jobs', 'invoices'] as const).map(tab => (
            <Route key={tab} path={`client/${tab}/:id`} element={<ClientGuard><LegacyClientRoute tab={tab} /></ClientGuard>} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/manager" element={<Shell role="manager"><ManagerDashboard /></Shell>} />
        <Route path="/manager/requests" element={<Shell role="manager"><RequestInbox /></Shell>} />
        <Route path="/manager/quotations/:requestId" element={<Shell role="manager"><QuoteBuilder /></Shell>} />
        <Route path="/manager/jobs" element={<Shell role="manager"><ManagerJobs /></Shell>} />
        <Route path="/manager/schedule" element={<Shell role="manager"><ManagerSchedule /></Shell>} />
        <Route path="/manager/invoices" element={<Shell role="manager"><Invoices /></Shell>} />
        <Route path="/manager/ai" element={<Shell role="manager"><PolicyPage /></Shell>} />
        <Route path="/manager/company" element={<Shell role="manager"><CompanyProfilePage /></Shell>} />
        <Route path="/manager/team" element={<Shell role="manager"><ManagerTeam /></Shell>} />

        <Route path="/employee" element={<Shell role="employee"><EmployeeHome /></Shell>} />
        <Route path="/employee/jobs" element={<Shell role="employee"><EmployeeJobs /></Shell>} />
        <Route path="/employee/jobs/:jobId" element={<Shell role="employee"><EmployeeJobDetail /></Shell>} />
        <Route path="/employee/schedule" element={<Shell role="employee"><EmployeeSchedule /></Shell>} />

        <Route path="/admin" element={<Shell role="admin"><AdminHome /></Shell>} />
        <Route path="/admin/companies" element={<Shell role="admin"><AdminCompanies /></Shell>} />
        <Route path="/admin/catalog" element={<Shell role="admin"><AdminCatalog /></Shell>} />
        <Route path="/admin/settings" element={<Shell role="admin"><AdminSettings /></Shell>} />
      </Routes>
    </SessionProvider>
  </BrowserRouter>
}
function StyleGuidePage() {
  const [modal, setModal] = useState(false)
  return <><PageHeader eyebrow="SHARED UI Â· MEMBER 1" title="The ServiceFlow toolkit" description="One shared component library for public, client and operational screens. All examples below use sample content." /><div className="grid items-start gap-6 lg:grid-cols-2"><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Actions</h2><div className="flex flex-wrap gap-4"><ActionButton variant="stamp" onClick={() => setModal(true)}>Open example dialog</ActionButton><ActionButton>Secondary</ActionButton><ActionButton variant="void">Destructive</ActionButton><ActionButton disabled>Unavailable</ActionButton></div><Notice>Use the yellow stamp for the primary action. Pair destructive actions with confirmation.</Notice></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Form fields</h2><TextField label="Service address" placeholder="Enter your address" /><TextField label="Email address" error="Enter a valid email address." defaultValue="sample" /><SelectField label="Service"><option>Basic inspection</option></SelectField><TextField label="Unavailable field" disabled value="Not editable" /></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Status vocabulary</h2><div className="flex flex-wrap gap-3">{(['awaiting', 'approved', 'declined', 'scheduled', 'in_progress', 'completed', 'paid', 'unpaid', 'cancelled'] as const).map(status => <StatusBadge key={status} status={status} />)}</div><p className="text-sm text-text-secondary">Use the backend state and a text label. A status color alone is insufficient.</p></SurfaceCard><SurfaceCard className="space-y-5 p-6"><h2 className="sf-display text-xl font-semibold">Feedback</h2><Skeleton rows={2} /><Notice error>Sample error: this appointment is no longer available.</Notice><EmptyState title="No requests yet" description="Your service requests will appear here." /></SurfaceCard></div><SharedExamples /><Modal open={modal} title="Example confirmation" description="This demonstrates the shared keyboard-accessible dialog." onClose={() => setModal(false)}><ActionButton variant="stamp" onClick={() => setModal(false)}>Close example</ActionButton></Modal></>
}
function CompanyRoute() {
  const { id } = useParams()
  return <CompanyPage key={id} />
}

function NotFoundPage() {
  return <><PageHeader title="We couldnâ€™t find that page" description="The link may have changed or the record may be unavailable." /><Link className="sf-link" to="/services">Browse services â†’</Link></>
}




===== FILE: src\main.tsx =====
import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { ThemeProvider, initTheme } from './lib/theme'

initTheme()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

