import { useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard, TextAreaField,
} from '../../components'
import { Notice, PageHeader, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { DisputeRow } from '../../types/provider'

const STATUS_FILTERS = [
  { value: '', label: 'All disputes' },
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

export default function AdminDisputes() {
  const disputes = useResource(() => providerService.adminListDisputes())
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<DisputeRow | null>(null)

  const list = (disputes.data ?? []).filter(d => !filter || d.status === filter)

  return <>
    <PageHeader title="Disputes" description="Review and resolve disputes between clients and providers." />

    <div className="mb-4 max-w-xs">
      <SelectField label="Filter by status" value={filter} onChange={e => setFilter(e.target.value)}>
        {STATUS_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>

    <Resource {...disputes} retry={disputes.reload}>
      {list.length === 0
        ? <EmptyState title="No disputes" description={filter ? 'No disputes with this status.' : 'No disputes have been raised.'} />
        : <div className="space-y-2">{list.map(d => (
            <SurfaceCard key={d.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="sf-mono text-xs text-text-secondary">Dispute #{d.id} · Job #{d.job_id}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${statusClass(d.status)}`}>{d.status.replaceAll('_', ' ')}</span>
                </div>
                {!['RESOLVED', 'CLOSED'].includes(d.status) && (
                  <ActionButton variant="stub" size="small" onClick={() => setEditing(d)}>Manage</ActionButton>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{d.reason}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{d.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-text-secondary sm:grid-cols-3">
                <div>Opened by user #{d.opened_by}</div>
                <div>Created {dateTime(d.created_at)}</div>
                {d.closed_at && <div>Closed {dateTime(d.closed_at)}</div>}
              </div>
              {d.admin_note && (
                <div className="rounded-docket border border-line bg-paper p-3 text-sm">
                  <p className="text-xs text-text-secondary">Admin note</p>
                  <p className="mt-1 whitespace-pre-wrap">{d.admin_note}</p>
                </div>
              )}
            </SurfaceCard>
          ))}</div>}
    </Resource>

    <Modal open={!!editing} title={`Dispute #${editing?.id ?? ''}`} onClose={() => setEditing(null)}>
      {editing && <UpdateDispute
        dispute={editing}
        onDone={() => { setEditing(null); disputes.reload() }}
        onCancel={() => setEditing(null)}
      />}
    </Modal>
  </>
}

function UpdateDispute({ dispute, onDone, onCancel }: {
  dispute: DisputeRow
  onDone: () => void
  onCancel: () => void
}) {
  const [status, setStatus] = useState<DisputeRow['status']>(dispute.status)
  const [adminNote, setAdminNote] = useState(dispute.admin_note ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError('')
    try {
      await providerService.adminUpdateDispute(dispute.id, {
        status,
        admin_note: adminNote.trim() || null,
      })
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-docket border border-line bg-paper p-3 text-sm">
      <p className="font-semibold">{dispute.reason}</p>
      <p className="mt-1 whitespace-pre-wrap">{dispute.description}</p>
    </div>
    <SelectField label="New status" value={status} onChange={e => setStatus(e.target.value as DisputeRow['status'])} required>
      <option value="OPEN">Open</option>
      <option value="UNDER_REVIEW">Under review</option>
      <option value="RESOLVED">Resolved</option>
      <option value="CLOSED">Closed</option>
    </SelectField>
    <TextAreaField label="Admin note (optional)" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Update dispute'}</ActionButton>
    </div>
  </form>
}

function statusClass(s: string): string {
  if (s === 'OPEN') return 'bg-[var(--sf-warning-bg)] text-[var(--sf-warning)]'
  if (s === 'UNDER_REVIEW') return 'bg-[var(--sf-info-bg)] text-[var(--sf-info)]'
  if (s === 'RESOLVED') return 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]'
  return 'bg-paper text-text-secondary'
}