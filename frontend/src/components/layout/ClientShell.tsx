import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowUpRight, BriefcaseBusiness, Building2, Check, ChevronRight, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Receipt, Search, Settings, X } from 'lucide-react'
import { useSession } from '../../app/session'
import { AccountIdentity } from './AccountIdentity'
import { demoMode } from '../../lib/api'

const clientLinks = [
  { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
  { label: 'Requests', href: '/client/requests', icon: ClipboardList },
  { label: 'Quotations', href: '/client/quotations', icon: FileText },
  { label: 'Jobs', href: '/client/jobs', icon: BriefcaseBusiness },
  { label: 'Invoices', href: '/client/invoices', icon: Receipt },
  { label: 'Profile / Settings', href: '/client/profile', icon: Settings },
]

export function Brand() {
  return <Link to="/" className="sf-brand" aria-label="ServiceFlow home"><span className="sf-brand-mark">SF<span /></span><span>ServiceFlow<span className="sf-brand-dot">.</span></span></Link>
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
    document.title = `ServiceFlow · ${clientArea ? section || 'Dashboard' : authArea ? 'Your account' : 'Find your service'}`
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
    {demoMode && <div className="sf-demo"><span className="sf-demo-dot" /><strong>Demo workspace</strong><span className="hidden sm:inline">Explore with sample data</span><span className="sf-demo-divider">/</span><span>No real bookings · resets on refresh</span></div>}
    {clientArea ? <>
      <aside className="sf-workspace-sidebar"><div className="sf-sidebar-brand"><Brand /></div>{navigation}<div className="sf-sidebar-tip"><div className="sf-sidebar-tip-icon"><Check size={17} /></div><strong>Every step, in one place.</strong><p>From your first request to your final invoice.</p><Link to="/companies">Find your next service <ArrowUpRight size={15} /></Link></div><div className="sf-sidebar-user"><span className="sf-avatar">{initials}</span><div><strong>{user.name}</strong><span>Client account</span></div><button type="button" aria-label="Log out" onClick={logout}><LogOut size={18} /></button></div></aside>
      <div className="sf-workspace-body"><header className="sf-workspace-topbar"><div className="sf-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{section}</strong></div><nav aria-label="Main navigation" className="sf-client-top-actions ml-auto flex items-center gap-3"><Link to="/companies" className="sf-topbar-action sf-topbar-discover"><Search size={16} />Find a service</Link>
        <AccountIdentity />
        <button type="button" onClick={logout} className="sf-small-button" aria-label="Log out">
          <LogOut size={16} aria-hidden="true" /><span>Log out</span>
        </button>
      </nav><button className="sf-mobile-menu" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-client-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></header>{menuOpen && <div id="mobile-client-navigation" className="sf-mobile-drawer"><Brand />{navigation}<button type="button" onClick={logout} className="sf-mobile-signout"><LogOut size={18} />Log out</button></div>}<main id="main-content" tabIndex={-1} className="sf-client-main"><Outlet /></main><div className="sf-workspace-footnote">ServiceFlow · Clear steps. Better service.<span>Asia/Colombo · LKR</span></div></div>
      <nav className="sf-bottom-nav" aria-label="Quick navigation">{clientLinks.filter(link => !['Requests', 'Profile / Settings'].includes(link.label)).map(({ href, label, icon: Icon }) => <NavLink key={href} to={href === '/client' ? href : `/client?tab=${href.split('/').pop()}`} className={(href === '/client' ? !location.search.includes('tab=') : location.search.includes(`tab=${href.split('/').pop()}`)) ? 'is-active' : ''}><Icon size={20} /><span>{label === 'Dashboard' ? 'Overview' : label}</span></NavLink>)}</nav>
    </> : <>
      <header className="sf-public-header"><div className="sf-public-header-inner"><Brand /><nav aria-label="Main navigation"><NavLink className="sf-public-nav-link" to="/companies">Find a service</NavLink>{!authArea && <Link className="sf-public-nav-link sf-how-link" to="/#how-it-works">How it works</Link>}{user ? <><AccountIdentity /><button type="button" onClick={logout} className="sf-small-button">Log out</button></> : <><Link className="sf-public-nav-link" to="/login">Sign in</Link><Link className="sf-small-button sf-small-button-dark" to="/register">Create account<ArrowUpRight size={15} /></Link></>}</nav></div></header>
      <main id="main-content" tabIndex={-1} className={`sf-public-main ${authArea ? 'sf-account-main' : ''}`}><Outlet /></main>
      <footer className="sf-public-footer"><div><Brand /><p>A simpler way to get the job done.</p></div><div className="sf-footer-links"><Link to="/companies">Find a service</Link><Link to="/style-guide">Component guide</Link><span>Asia/Colombo · LKR</span></div><p className="sf-footer-note"><Building2 size={15} />Built for local service companies and the people who count on them.</p></footer>
    </>}
  </div>
}
