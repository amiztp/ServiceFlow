import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EmptyState, SelectField, SurfaceCard, Tabs,
} from '../../components'
import { PageHeader, RecordStatus, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { JobRow, RequestRow } from '../../types/provider'

const tabs = [
  { key: 'requests', label: 'Requests' },
  { key: 'jobs', label: 'Jobs' },
] as const
type Tab = typeof tabs[number]['key']

const REQUEST_STATUS = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'NEED_INFORMATION', label: 'Needs information' },
  { value: 'QUOTATION_SENT', label: 'Quotation sent' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const JOB_STATUS = [
  { value: '', label: 'All statuses' },
  { value: 'JOB_CREATED', label: 'Job created' },
  { value: 'SCHEDULE_PROPOSED', label: 'Schedule proposed' },
  { value: 'SCHEDULE_CONFIRMED', label: 'Schedule confirmed' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function AllRequestsJobs() {
  const [tab, setTab] = useState<Tab>('requests')
  return <>
    <PageHeader title="All requests & jobs" description="Platform-wide view of every request and job.">
      <Link to="/admin/disputes" className="sf-link">Review disputes →</Link>
    </PageHeader>
    <Tabs label="Platform data" items={tabs} value={tab} onChange={setTab}>
      {tab === 'requests' && <RequestsView />}
      {tab === 'jobs' && <JobsView />}
    </Tabs>
  </>
}

function RequestsView() {
  const [status, setStatus] = useState('')
  const data = useResource(
    () => providerService.listIncomingRequests(status || undefined),
    [status],
  )
  return <>
    <div className="mb-4 max-w-xs">
      <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)}>
        {REQUEST_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>
    <Resource {...data} retry={data.reload}>
      {data.data && data.data.items.length === 0
        ? <EmptyState title="No requests" description="No requests match these filters." />
        : <div className="space-y-2">{data.data?.items.map(r => (
            <RequestCard key={r.id} r={r} />
          ))}</div>}
    </Resource>
  </>
}

function JobsView() {
  const [status, setStatus] = useState('')
  const data = useResource(
    () => providerService.listJobs({ status: status || undefined }),
    [status],
  )
  return <>
    <div className="mb-4 max-w-xs">
      <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)}>
        {JOB_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>
    <Resource {...data} retry={data.reload}>
      {data.data && data.data.items.length === 0
        ? <EmptyState title="No jobs" description="No jobs match these filters." />
        : <div className="space-y-2">{data.data?.items.map(j => (
            <JobCard key={j.id} j={j} />
          ))}</div>}
    </Resource>
  </>
}

function RequestCard({ r }: { r: RequestRow }) {
  return <SurfaceCard className="space-y-2 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="sf-mono text-xs text-text-secondary">Request #{r.id}</span>
      <RecordStatus status={r.status} />
    </div>
    <p className="text-sm">{r.description}</p>
    <p className="text-xs text-text-secondary">
      Provider #{r.provider_id} · Client #{r.client_id} · {r.address}
    </p>
    <p className="text-xs text-text-secondary">
      Preferred {r.preferred_date}
      {r.preferred_time ? ` ${r.preferred_time.slice(0, 5)}` : ''}
      {' · Created '}{dateTime(r.created_at)}
    </p>
  </SurfaceCard>
}

function JobCard({ j }: { j: JobRow }) {
  return <SurfaceCard className="space-y-2 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="sf-mono text-xs text-text-secondary">Job #{j.id} · Request #{j.request_id}</span>
      <RecordStatus status={j.status} />
    </div>
    <p className="text-sm">
      {j.schedule_date
        ? `Scheduled ${j.schedule_date}${j.schedule_time ? ` ${j.schedule_time.slice(0, 5)}` : ''}`
        : 'Not scheduled'}
      {' · '}<span className="text-text-secondary">{j.schedule_status}</span>
    </p>
    <p className="text-xs text-text-secondary">
      Provider #{j.provider_id}
      {j.assigned_user_id ? ` · Employee #${j.assigned_user_id}` : ' · Unassigned'}
      {' · Created '}{dateTime(j.created_at)}
    </p>
    {j.completed_at && <p className="text-xs text-text-secondary">Completed {dateTime(j.completed_at)}</p>}
    {j.cancellation_reason && <p className="text-xs text-[var(--sf-error)]">Cancelled: {j.cancellation_reason}</p>}
  </SurfaceCard>
}