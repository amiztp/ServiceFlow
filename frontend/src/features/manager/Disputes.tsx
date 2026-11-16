import { EmptyState, SurfaceCard } from '../../components'
import { PageHeader, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { DisputeRow } from '../../types/provider'

export default function ManagerDisputes() {
  const disputes = useResource(() => providerService.listMyDisputes())

  return <>
    <PageHeader title="Disputes" description="Issues raised on your jobs. Resolved by the platform admin." />
    <Resource {...disputes} retry={disputes.reload}>
      {disputes.data && disputes.data.length === 0
        ? <EmptyState title="No disputes" description="Open a dispute from a completed job if something went wrong." />
        : <div className="space-y-2">{disputes.data?.map(d => (
            <DisputeCard key={d.id} dispute={d} />
          ))}</div>}
    </Resource>
  </>
}

function DisputeCard({ dispute }: { dispute: DisputeRow }) {
  return <SurfaceCard className="space-y-3 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="sf-mono text-xs text-text-secondary">Dispute #{dispute.id} · Job #{dispute.job_id}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${statusClass(dispute.status)}`}>
          {dispute.status.replaceAll('_', ' ')}
        </span>
      </div>
      <span className="text-xs text-text-secondary">
        Opened by {dispute.opened_by === 0 ? 'you' : `user #${dispute.opened_by}`}
      </span>
    </div>
    <div>
      <p className="text-sm font-semibold">{dispute.reason}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{dispute.description}</p>
    </div>
    <div className="text-xs text-text-secondary">
      Opened {dateTime(dispute.created_at)}
      {dispute.closed_at && ` · Closed ${dateTime(dispute.closed_at)}`}
    </div>
    {dispute.admin_note && (
      <div className="rounded-docket border border-line bg-paper p-3 text-sm">
        <p className="text-xs text-text-secondary">Admin note</p>
        <p className="mt-1 whitespace-pre-wrap">{dispute.admin_note}</p>
      </div>
    )}
  </SurfaceCard>
}

function statusClass(s: string): string {
  if (s === 'OPEN') return 'bg-[var(--sf-warning-bg)] text-[var(--sf-warning)]'
  if (s === 'UNDER_REVIEW') return 'bg-[var(--sf-info-bg)] text-[var(--sf-info)]'
  if (s === 'RESOLVED') return 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]'
  return 'bg-paper text-text-secondary'
}