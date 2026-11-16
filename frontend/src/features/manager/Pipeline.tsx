import { useNavigate } from 'react-router-dom'
import { ActionButton, EmptyState, SurfaceCard } from '../../components'
import { PageHeader, RecordStatus, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { JobRow, RequestRow } from '../../types/provider'

type Column = {
  key: string
  label: string
  cards: Card[]
}

type Card =
  | { kind: 'request'; id: number; label: string; status: string; sub: string }
  | { kind: 'job'; id: number; label: string; status: string; sub: string }

export default function Pipeline() {
  const navigate = useNavigate()
  const data = useResource(async () => {
    const [requests, jobs] = await Promise.all([
      providerService.listIncomingRequests(),
      providerService.listJobs(),
    ])
    return { requests: requests.items, jobs: jobs.items }
  })

  return <>
    <PageHeader title="Pipeline" description="Every request and job in one board." />
    <Resource {...data} retry={data.reload}>
      {data.data && <Board
        requests={data.data.requests}
        jobs={data.data.jobs}
        onOpen={(path) => navigate(path)}
      />}
    </Resource>
  </>
}

function Board({ requests, jobs, onOpen }: {
  requests: RequestRow[]
  jobs: JobRow[]
  onOpen: (path: string) => void
}) {
  const reqCard = (r: RequestRow): Card => ({
    kind: 'request', id: r.id, status: r.status,
    label: `Request #${r.id}`,
    sub: r.description.slice(0, 60) + (r.description.length > 60 ? '…' : ''),
  })
  const jobCard = (j: JobRow): Card => ({
    kind: 'job', id: j.id, status: j.status,
    label: `Job #${j.id}`,
    sub: j.schedule_date
      ? `${j.schedule_date}${j.schedule_time ? ` ${j.schedule_time.slice(0, 5)}` : ''}`
      : 'Not scheduled',
  })

  const columns: Column[] = [
    { key: 'NEW', label: 'New', cards: requests.filter(r => r.status === 'NEW').map(reqCard) },
    { key: 'UNDER_REVIEW', label: 'Under review', cards: requests.filter(r => r.status === 'UNDER_REVIEW').map(reqCard) },
    { key: 'NEED_INFO', label: 'Needs information', cards: requests.filter(r => r.status === 'NEED_INFORMATION').map(reqCard) },
    { key: 'QUOTED', label: 'Quotation sent', cards: requests.filter(r => r.status === 'QUOTATION_SENT').map(reqCard) },
    { key: 'JOB_CREATED', label: 'Accepted', cards: jobs.filter(j => j.status === 'JOB_CREATED').map(jobCard) },
    { key: 'SCHEDULED', label: 'Scheduled', cards: jobs.filter(j => ['SCHEDULE_PROPOSED', 'SCHEDULE_CONFIRMED'].includes(j.status)).map(jobCard) },
    { key: 'IN_PROGRESS', label: 'In progress', cards: jobs.filter(j => j.status === 'IN_PROGRESS').map(jobCard) },
    { key: 'COMPLETED', label: 'Completed', cards: jobs.filter(j => j.status === 'COMPLETED').map(jobCard) },
  ]

  const totalCards = columns.reduce((s, c) => s + c.cards.length, 0)
  if (totalCards === 0) {
    return <EmptyState
      title="Pipeline is empty"
      description="Requests and jobs will appear here as they move through the workflow."
    />
  }

  return <div className="overflow-x-auto pb-4">
    <div className="flex min-w-max gap-3">
      {columns.map(col => (
        <SurfaceCard key={col.key} className="w-72 shrink-0 space-y-2 p-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="sf-mono text-xs font-semibold">{col.label}</h3>
            <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] text-text-secondary">
              {col.cards.length}
            </span>
          </div>
          {col.cards.length === 0
            ? <p className="py-4 text-center text-xs text-text-secondary">Empty</p>
            : <div className="space-y-2">{col.cards.map(c => (
                <button
                  key={`${c.kind}-${c.id}`}
                  type="button"
                  onClick={() => onOpen(c.kind === 'request'
                    ? `/manager/requests`
                    : `/manager/jobs`)}
                  className="w-full rounded-docket border border-line bg-white p-3 text-left transition hover:border-graphite"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="sf-mono text-[11px] text-text-secondary">{c.label}</span>
                  </div>
                  <p className="text-sm line-clamp-2">{c.sub}</p>
                  <div className="mt-2"><RecordStatus status={c.status} /></div>
                </button>
              ))}</div>}
        </SurfaceCard>
      ))}
    </div>
  </div>
}