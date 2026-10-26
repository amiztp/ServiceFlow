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
    <div className="mt-4 space-y-1 text-sm text-text-secondary"><p><MapPin size={15} className="mr-2 inline" aria-hidden="true"/>{location}</p><p><span className="text-[#6E5600]" aria-hidden="true">★</span> <span className="sf-tabular">{rating}</span> · {jobs} jobs</p></div>
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
  useEffect(()=>{ if (!open) return
    const previous=document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable=()=>Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? [])
    focusable()[0]?.focus()
    const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()
      if(event.key==='Tab'){const controls=focusable();if(!controls.length)return
        const first=controls[0],last=controls[controls.length-1]
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
      }}
    document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);previous?.focus()}
  },[open,onClose])
  const headingId = useId()
  if(!open)return null
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#22262B]/45 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={headingId} className="sf-card w-full max-w-lg p-6">
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
    {answer && source && page != null && <div className="sf-mono mt-4 inline-flex items-center gap-2 rounded-docket border border-border px-2 py-1 text-[11px] text-text-secondary"><FileSearch size={15} aria-hidden="true"/>Source: {source} · Page {page}</div>}</>}
  </SurfaceCard>
}
export const icons = { Plus,Pencil,Eye,ListFilter,Download,Upload,Ellipsis,Banknote,CalendarDays,Clock3,MapPin,ChevronDown }
