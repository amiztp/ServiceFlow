import { useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard,
  Tabs, TextField,
} from '../../components'
import { Notice, PageHeader, RecordStatus, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { EmployeeRow, JobRow } from '../../types/provider'

const tabs = [
  { key: 'all', label: 'All jobs' },
  { key: 'active', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const
type Tab = typeof tabs[number]['key']

const statusFilter: Record<Tab, string | undefined> = {
  all: undefined,
  active: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}

export default function ManagerJobs() {
  const [tab, setTab] = useState<Tab>('all')
  const jobs = useResource(
    () => providerService.listJobs(statusFilter[tab] ? { status: statusFilter[tab] } : undefined),
    [tab],
  )
  const employees = useResource((): Promise<EmployeeRow[]> =>
    providerService.listEmployees().catch(() => [] as EmployeeRow[]),
  )
  const [openJobId, setOpenJobId] = useState<number | null>(null)

  return <>
    <PageHeader title="Jobs" description="Every job created from your accepted quotations." />
    <Tabs label="Job views" items={tabs} value={tab} onChange={setTab}>
      <Resource {...jobs} retry={jobs.reload}>
        {jobs.data && (jobs.data.items.length === 0
          ? <EmptyState
              title="No jobs here"
              description={
                tab === 'all' ? 'Completed requests become jobs.' :
                tab === 'active' ? 'No jobs currently in progress.' :
                tab === 'completed' ? 'No completed jobs yet.' :
                'No cancelled jobs.'
              }
            />
          : <div className="space-y-3">{jobs.data.items.map((j: JobRow) => (
              <SurfaceCard key={j.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="sf-mono text-xs text-text-secondary">Job #{j.id}</span>
                    <RecordStatus status={j.status} />
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    Request #{j.request_id}
                    {j.schedule_date && ` · ${j.schedule_date} ${j.schedule_time?.slice(0, 5) ?? ''}`}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {j.assigned_user_id ? `Assigned to employee #${j.assigned_user_id}` : 'Not assigned'}
                  </p>
                </div>
                <ActionButton variant="stub" size="small" onClick={() => setOpenJobId(j.id)}>Manage</ActionButton>
              </SurfaceCard>
            ))}</div>
        )}
      </Resource>
    </Tabs>
    <Modal open={openJobId !== null} title={`Job #${openJobId ?? ''}`} onClose={() => setOpenJobId(null)}>
      {openJobId !== null && <JobManager
        jobId={openJobId}
        employees={employees.data ?? []}
        onChanged={() => { jobs.reload(); employees.reload() }}
        onClose={() => setOpenJobId(null)}
      />}
    </Modal>
  </>
}

function JobManager({ jobId, employees, onChanged, onClose }: {
  jobId: number
  employees: EmployeeRow[]
  onChanged: () => void
  onClose: () => void
}) {
  const job = useResource(() => providerService.getJob(jobId), [jobId])
  const [pending, setPending] = useState<'assign' | 'schedule' | 'cancel' | null>(null)
  const [error, setError] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [cancelReason, setCancelReason] = useState('')

  async function assign() {
    if (!employeeId) return
    setPending('assign'); setError('')
    try {
      await providerService.assignEmployee(jobId, Number(employeeId))
      setEmployeeId(''); job.reload(); onChanged()
    } catch (c) { setError((c as Error).message) } finally { setPending(null) }
  }

  async function propose(e: FormEvent) {
    e.preventDefault()
    if (!date || !time) return
    setPending('schedule'); setError('')
    try {
      await providerService.proposeSchedule(jobId, date, `${time}:00`)
      job.reload(); onChanged()
    } catch (c) { setError((c as Error).message) } finally { setPending(null) }
  }

  async function cancel() {
    if (!cancelReason.trim()) return
    setPending('cancel'); setError('')
    try {
      await providerService.cancelJob(jobId, cancelReason.trim())
      job.reload(); onChanged()
    } catch (c) { setError((c as Error).message) } finally { setPending(null) }
  }

  return <Resource {...job} retry={job.reload}>
    {job.data && (() => {
      const isReassign = !!job.data.assigned_user_id
      const canAssign = employees.length > 0 &&
        ['JOB_CREATED', 'SCHEDULE_PROPOSED'].includes(job.data.status)
      const canSchedule = job.data.schedule_status === 'NOT_PROPOSED' && job.data.status === 'JOB_CREATED'
      const canCancel = ['JOB_CREATED', 'SCHEDULE_PROPOSED', 'SCHEDULE_CONFIRMED'].includes(job.data.status)
      return <>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <RecordStatus status={job.data.status} />
            <span className="sf-mono text-xs text-text-secondary">Schedule: {job.data.schedule_status}</span>
          </div>
          {job.data.schedule_date && (
            <p className="text-sm">Proposed: <strong>{job.data.schedule_date} at {job.data.schedule_time?.slice(0, 5)}</strong></p>
          )}
          <p className="text-sm text-text-secondary">
            {job.data.assigned_user_id ? `Assigned to employee #${job.data.assigned_user_id}` : 'No employee assigned'}
          </p>
        </div>

        {error && <div className="mt-3"><Notice error>{error}</Notice></div>}

        {canAssign && (
          <SurfaceCard className="mt-4 space-y-3 p-4">
            <h3 className="font-semibold">{isReassign ? 'Reassign employee' : 'Assign employee'}</h3>
            {isReassign && <Notice>Changing the employee may reset the proposed schedule. The backend will validate.</Notice>}
            <SelectField label="Employee" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">— {isReassign ? 'Pick a new employee' : 'Select'} —</option>
              {employees.filter(e => e.status === 'ACTIVE').map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </SelectField>
            <div className="flex justify-end">
              <ActionButton variant="stamp" onClick={assign} disabled={!employeeId || pending === 'assign'}>
                {pending === 'assign' ? 'Assigning…' : (isReassign ? 'Reassign' : 'Assign')}
              </ActionButton>
            </div>
          </SurfaceCard>
        )}

        {canSchedule && (
          <SurfaceCard className="mt-4 space-y-3 p-4">
            <h3 className="font-semibold">Propose schedule</h3>
            <form onSubmit={propose} className="space-y-3">
              <TextField label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              <TextField label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} required />
              <div className="flex justify-end">
                <ActionButton type="submit" variant="stamp" disabled={!date || !time || pending === 'schedule'}>
                  {pending === 'schedule' ? 'Proposing…' : 'Propose schedule'}
                </ActionButton>
              </div>
            </form>
          </SurfaceCard>
        )}

        {canCancel && (
          <SurfaceCard className="mt-4 space-y-3 p-4">
            <h3 className="font-semibold">Cancel job</h3>
            <TextField label="Reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} required />
            <div className="flex justify-end">
              <ActionButton variant="void" onClick={cancel} disabled={!cancelReason.trim() || pending === 'cancel'}>
                {pending === 'cancel' ? 'Cancelling…' : 'Cancel job'}
              </ActionButton>
            </div>
          </SurfaceCard>
        )}

        <div className="mt-5 flex justify-end">
          <ActionButton onClick={onClose}>Close</ActionButton>
        </div>
      </>
    })()}
  </Resource>
}