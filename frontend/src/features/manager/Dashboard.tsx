import { useNavigate } from 'react-router-dom'
import { ActionButton, SurfaceCard } from '../../components'
import { Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { InvoiceRow, JobRow, RequestRow } from '../../types/provider'

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const data = useResource(async () => {
    const [requests, jobs, invoices] = await Promise.all([
      providerService.listIncomingRequests(),
      providerService.listJobs(),
      providerService.listInvoices(),
    ])
    return {
      requests: requests.items,
      jobs: jobs.items,
      invoices: invoices.items,
    }
  })

  return <>
    <div className="mb-6">
      <h1 className="sf-display text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-text-secondary">Your work at a glance.</p>
    </div>

    <Resource {...data} retry={data.reload}>
      {data.data && <DashboardContent
        requests={data.data.requests}
        jobs={data.data.jobs}
        invoices={data.data.invoices}
        onNavigate={navigate}
      />}
    </Resource>
  </>
}

function DashboardContent({ requests, jobs, invoices, onNavigate }: {
  requests: RequestRow[]
  jobs: JobRow[]
  invoices: InvoiceRow[]
  onNavigate: (path: string) => void
}) {
  const newRequests = requests.filter(r => r.status === 'NEW').length
  const underReview = requests.filter(r => r.status === 'UNDER_REVIEW').length
  const needInfo = requests.filter(r => r.status === 'NEED_INFORMATION').length
  const quotationSent = requests.filter(r => r.status === 'QUOTATION_SENT').length

  const jobsAwaitingSchedule = jobs.filter(j => j.status === 'JOB_CREATED').length
  const jobsInProgress = jobs.filter(j => j.status === 'IN_PROGRESS').length
  const jobsScheduled = jobs.filter(j => j.status === 'SCHEDULE_CONFIRMED' || j.status === 'SCHEDULE_PROPOSED').length
  const jobsCompleted = jobs.filter(j => j.status === 'COMPLETED').length

  const unpaid = invoices.filter(i => i.payment_status !== 'PAID')
  const outstandingAmount = unpaid.reduce((sum, i) =>
    sum + Number(i.total_amount) - Number(i.paid_amount), 0)
  const collectedAmount = invoices.reduce((sum, i) => sum + Number(i.paid_amount), 0)

  return <>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="NEW REQUESTS"
        value={String(newRequests)}
        detail={`${underReview} under review · ${needInfo} need info`}
        onClick={() => onNavigate('/manager/requests')}
      />
      <MetricCard
        label="AWAITING CLIENT"
        value={String(quotationSent)}
        detail="Quotations sent"
        onClick={() => onNavigate('/manager/requests')}
      />
      <MetricCard
        label="JOBS IN PROGRESS"
        value={String(jobsInProgress)}
        detail={`${jobsScheduled} scheduled · ${jobsAwaitingSchedule} unscheduled`}
        onClick={() => onNavigate('/manager/jobs')}
      />
      <MetricCard
        label="COMPLETED JOBS"
        value={String(jobsCompleted)}
        detail="All time"
        onClick={() => onNavigate('/manager/jobs')}
      />
    </div>

    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <MetricCard
        label="OUTSTANDING"
        value={`LKR ${outstandingAmount.toFixed(2)}`}
        detail={`${unpaid.length} invoice${unpaid.length === 1 ? '' : 's'} unpaid`}
        onClick={() => onNavigate('/manager/invoices')}
        warning
      />
      <MetricCard
        label="COLLECTED"
        value={`LKR ${collectedAmount.toFixed(2)}`}
        detail="All recorded payments"
        onClick={() => onNavigate('/manager/invoices')}
      />
    </div>

    <SurfaceCard className="mt-6 p-5">
      <h2 className="mb-3 font-semibold">Quick actions</h2>
      <div className="flex flex-wrap gap-2">
        <ActionButton variant="stamp" onClick={() => onNavigate('/manager/requests')}>Review requests</ActionButton>
        <ActionButton variant="stub" onClick={() => onNavigate('/manager/schedule')}>Schedule a job</ActionButton>
        <ActionButton variant="stub" onClick={() => onNavigate('/manager/invoices')}>Record payment</ActionButton>
        <ActionButton variant="stub" onClick={() => onNavigate('/manager/team')}>Manage team</ActionButton>
        <ActionButton variant="stub" onClick={() => onNavigate('/manager/business')}>My business</ActionButton>
      </div>
    </SurfaceCard>

    <SurfaceCard className="mt-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Recent requests</h2>
        <ActionButton variant="stub" size="small" onClick={() => onNavigate('/manager/requests')}>View all</ActionButton>
      </div>
      {requests.length === 0
        ? <p className="text-sm text-text-secondary">No requests yet.</p>
        : <ul className="divide-y divide-line">
            {requests.slice(0, 5).map(r => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{r.description}</p>
                  <p className="text-xs text-text-secondary">
                    #{r.id} · {r.status.replaceAll('_', ' ').toLowerCase()} · {r.address}
                  </p>
                </div>
                <span className="text-xs text-text-secondary">{r.preferred_date}</span>
              </li>
            ))}
          </ul>}
    </SurfaceCard>
  </>
}

function MetricCard({ label, value, detail, onClick, warning = false }: {
  label: string
  value: string
  detail?: string
  onClick?: () => void
  warning?: boolean
}) {
  return <button
    type="button"
    onClick={onClick}
    className="sf-card w-full p-5 text-left transition hover:border-graphite"
  >
    <p className="sf-mono text-[11px] text-text-secondary">{label}</p>
    <p className={`sf-tabular mt-2 text-2xl font-semibold ${warning && Number(value.replace(/[^0-9.]/g, '')) > 0 ? 'text-[var(--sf-warning)]' : ''}`}>
      {value}
    </p>
    {detail && <p className="mt-1 text-xs text-text-secondary">{detail}</p>}
  </button>
}