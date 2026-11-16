import { useState } from 'react'
import {
  ActionButton, EmptyState, SelectField, SurfaceCard,
} from '../../components'
import { Notice, PageHeader, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { AdminProviderRow } from '../../types/provider'

const VERIFICATION_FILTERS = [
  { value: '', label: 'All providers' },
  { value: 'PENDING', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'COMPANY', label: 'Company' },
]

export default function AdminCompanies() {
  const [status, setStatus] = useState('PENDING')
  const [type, setType] = useState('')
  const providers = useResource(
    () => providerService.adminListProviders({
      verification_status: status || undefined,
      provider_type: type || undefined,
    }),
    [status, type],
  )
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function act(id: number, action: 'approve' | 'reject' | 'suspend') {
    setBusy(id); setError(''); setSuccess('')
    try {
      const fn =
        action === 'approve' ? providerService.adminApproveProvider :
        action === 'reject' ? providerService.adminRejectProvider :
        providerService.adminSuspendProvider
      const res = await fn(id)
      setSuccess(res.message || `Provider #${id} ${action}d.`)
      providers.reload()
    } catch (c) { setError((c as Error).message) } finally { setBusy(null) }
  }

  return <>
    <PageHeader title="Verification queue" description="Approve, reject or suspend service providers." />

    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value)}>
        {VERIFICATION_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
      <SelectField label="Provider type" value={type} onChange={e => setType(e.target.value)}>
        {TYPE_FILTERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>

    {error && <div className="mb-3"><Notice error>{error}</Notice></div>}
    {success && <div className="mb-3"><Notice>{success}</Notice></div>}

    <Resource {...providers} retry={providers.reload}>
      {providers.data && providers.data.items.length === 0
        ? <EmptyState
            title="No providers"
            description={status === 'PENDING' ? 'No providers awaiting verification.' : 'No providers match these filters.'}
          />
        : <div className="space-y-2">{providers.data?.items.map(p => (
            <ProviderCard key={p.id} provider={p} busy={busy === p.id} onAction={act} />
          ))}</div>}
    </Resource>
  </>
}

function ProviderCard({ provider, busy, onAction }: {
  provider: AdminProviderRow
  busy: boolean
  onAction: (id: number, action: 'approve' | 'reject' | 'suspend') => void
}) {
  const s = provider.verification_status
  return <SurfaceCard className="space-y-3 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="sf-display font-semibold">{provider.name}</h3>
          <span className={`rounded px-2 py-0.5 text-xs ${statusClass(s)}`}>{s}</span>
          <span className="rounded bg-paper px-2 py-0.5 text-xs text-text-secondary">{provider.type}</span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">{provider.description ?? 'No description'}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
      <div><p className="text-xs text-text-secondary">Email</p><p>{provider.email}</p></div>
      <div><p className="text-xs text-text-secondary">Phone</p><p>{provider.phone}</p></div>
      <div><p className="text-xs text-text-secondary">Address</p><p>{provider.address ?? '—'}</p></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <p className="text-xs text-text-secondary">Registered {dateTime(provider.created_at)}</p>
      <div className="flex flex-wrap gap-2">
        {s !== 'APPROVED' && (
          <ActionButton variant="stamp" size="small" onClick={() => onAction(provider.id, 'approve')} disabled={busy}>
            Approve
          </ActionButton>
        )}
        {s !== 'REJECTED' && (
          <ActionButton variant="void" size="small" onClick={() => onAction(provider.id, 'reject')} disabled={busy}>
            Reject
          </ActionButton>
        )}
        {s === 'APPROVED' && (
          <ActionButton variant="void" size="small" onClick={() => onAction(provider.id, 'suspend')} disabled={busy}>
            Suspend
          </ActionButton>
        )}
      </div>
    </div>
  </SurfaceCard>
}

function statusClass(s: string): string {
  if (s === 'APPROVED') return 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]'
  if (s === 'PENDING') return 'bg-[var(--sf-warning-bg)] text-[var(--sf-warning)]'
  if (s === 'REJECTED') return 'bg-[var(--sf-error-bg)] text-[var(--sf-error)]'
  return 'bg-paper text-text-secondary'
}