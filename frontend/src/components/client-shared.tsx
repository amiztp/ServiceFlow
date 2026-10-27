import { useEffect, useState, type DependencyList, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ActionButton, EmptyState, Skeleton, StatusBadge, type WorkflowStatus } from './index'
export const money = (value: number) => `LKR ${value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const dateTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
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
  if (error) return <div role="alert" className="sf-card p-6"><h2 className="sf-display font-semibold">We couldn’t load this</h2><p className="my-3">{error}</p><ActionButton onClick={retry}>Try again</ActionButton></div>
  return <>{children}</>
}
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="mb-7 flex flex-wrap items-end justify-between gap-5"><div>{eyebrow && <p className="sf-mono mb-2 text-xs text-text-secondary">{eyebrow}</p>}<h1 className="sf-display text-3xl font-bold md:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-text-secondary">{description}</p>}</div>{children}</header>
}
const statusMap: Record<string, WorkflowStatus> = { NEW: 'awaiting', QUOTED: 'awaiting', CONVERTED: 'approved', DRAFT: 'awaiting', SENT: 'awaiting', APPROVED: 'approved', DECLINED: 'declined', REJECTED: 'declined', CANCELLED: 'cancelled', JOB_CREATED: 'awaiting', SCHEDULE_PROPOSED: 'awaiting', SCHEDULE_CONFIRMED: 'scheduled', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', UNPAID: 'unpaid', PAID: 'paid' }
export function RecordStatus({ status }: { status: string }) { return <StatusBadge status={statusMap[status] || 'awaiting'} label={status.toLowerCase().replaceAll('_', ' ')} /> }
export function EmptyRecords({ title }: { title: string }) { return <EmptyState title={title} description="Your records will appear here as your service request progresses."><Link className="sf-link" to="/companies">Browse companies →</Link></EmptyState> }
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) { return <p role={error ? 'alert' : 'status'} className={`rounded-docket border p-3 text-sm ${error ? 'border-red-300 bg-red-50 text-red-800' : 'border-border bg-paper'}`}>{children}</p> }
