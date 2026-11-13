import { SurfaceCard } from '../../components'
import { Notice, Resource, statusLabel, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import type { RequestRecord } from '../../types/client'

export function RequestTimeline({ request }: { request: RequestRecord }) {
  const resource = useResource(async () => {
    const jobs = await clientService.jobs()
    const job = jobs.find(value => value.request_id === request.id)
    const invoices = job?.status === 'COMPLETED' ? await clientService.invoices() : []
    return { job, invoice: invoices.find(value => value.job_id === job?.id) }
  }, [request.id, request.status])
  const job = resource.data?.job
  const invoice = resource.data?.invoice
  const stages = [
    { title: 'Request submitted', complete: true },
    { title: 'Quotation received', complete: !!request.quotation_id },
    { title: 'Quotation approved / job created', complete: request.status === 'CONVERTED' },
    { title: 'Appointment proposed', complete: !!job?.appointment },
    { title: 'Appointment approved', complete: !!job && ['SCHEDULE_CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(job.status) },
    { title: 'Work completed', complete: job?.status === 'COMPLETED' },
    { title: 'Invoice issued', complete: !!invoice },
    { title: 'Offline payment recorded', complete: invoice?.status === 'PAID' },
  ]
  return <SurfaceCard className="max-w-3xl p-6">
    <details>
      <summary className="cursor-pointer font-semibold">Request tracking timeline</summary>
      <div className="mt-5">
        <Resource {...resource} retry={resource.reload}>
          <Notice>Current request status · {statusLabel(request.status)}{job ? ` · ${statusLabel(job.status)}` : ''}</Notice>
          <p className="my-4 text-sm text-text-secondary">Progress is derived from current records. Historical event times will come from the backend.</p>
          <ol className="space-y-4">{stages.map(stage => <li key={stage.title} className="flex flex-wrap justify-between gap-3 border-b border-line pb-3">
            <span>{stage.title}</span><span className="sf-mono text-xs">{stage.complete ? 'Reached' : ['CANCELLED', 'DECLINED', 'REJECTED'].includes(request.status) || job?.status === 'CANCELLED' ? 'Closed' : 'Pending'}</span>
          </li>)}</ol>
        </Resource>
      </div>
    </details>
  </SurfaceCard>
}
