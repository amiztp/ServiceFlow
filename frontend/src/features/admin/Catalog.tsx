import { useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, SurfaceCard, TextAreaField, TextField,
} from '../../components'
import { Notice, PageHeader, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { CatalogService } from '../../types/provider'

export default function AdminCatalog() {
  const services = useResource(() => providerService.adminListServices())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<CatalogService | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const list = services.data ?? []
  const activeCount = list.filter(s => s.is_active).length
  const inactiveCount = list.filter(s => !s.is_active).length

  async function deactivate(id: number) {
    setBusy(id); setError(''); setSuccess('')
    try {
      await providerService.adminDeactivateService(id)
      setSuccess(`Service #${id} deactivated.`)
      services.reload()
    } catch (c) { setError((c as Error).message) } finally { setBusy(null) }
  }

  async function reactivate(id: number) {
    setBusy(id); setError(''); setSuccess('')
    try {
      await providerService.adminUpdateService(id, { is_active: true })
      setSuccess(`Service #${id} reactivated.`)
      services.reload()
    } catch (c) { setError((c as Error).message) } finally { setBusy(null) }
  }

  return <>
    <PageHeader title="Service catalog" description="Master list every provider picks from when offering services.">
      <ActionButton variant="stamp" onClick={() => setAdding(true)}>+ Add service</ActionButton>
    </PageHeader>

    <div className="mb-4 grid grid-cols-2 gap-3">
      <SurfaceCard className="p-4">
        <p className="sf-mono text-xs text-text-secondary">ACTIVE</p>
        <p className="sf-tabular mt-1 text-2xl font-semibold">{activeCount}</p>
      </SurfaceCard>
      <SurfaceCard className="p-4">
        <p className="sf-mono text-xs text-text-secondary">INACTIVE</p>
        <p className="sf-tabular mt-1 text-2xl font-semibold">{inactiveCount}</p>
      </SurfaceCard>
    </div>

    {error && <div className="mb-3"><Notice error>{error}</Notice></div>}
    {success && <div className="mb-3"><Notice>{success}</Notice></div>}

    <Resource {...services} retry={services.reload}>
      {list.length === 0
        ? <EmptyState title="No services yet" description="Add the first service to the catalog." />
        : <div className="space-y-2">{list.map(s => (
            <SurfaceCard key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="sf-display font-semibold">{s.name}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs ${s.is_active
                    ? 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]'
                    : 'bg-paper text-text-secondary'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {s.category && (
                    <span className="rounded bg-paper px-2 py-0.5 text-xs text-text-secondary">{s.category}</span>
                  )}
                </div>
                {s.description && <p className="mt-1 text-sm text-text-secondary">{s.description}</p>}
              </div>
              <div className="flex gap-2">
                <ActionButton variant="stub" size="small" onClick={() => setEditing(s)}>Edit</ActionButton>
                {s.is_active
                  ? <ActionButton variant="void" size="small" onClick={() => deactivate(s.id)} disabled={busy === s.id}>
                      {busy === s.id ? '…' : 'Deactivate'}
                    </ActionButton>
                  : <ActionButton variant="stub" size="small" onClick={() => reactivate(s.id)} disabled={busy === s.id}>
                      {busy === s.id ? '…' : 'Reactivate'}
                    </ActionButton>}
              </div>
            </SurfaceCard>
          ))}</div>}
    </Resource>

    <Modal open={adding} title="Add service" onClose={() => setAdding(false)}>
      {adding && <ServiceForm
        onDone={() => { setAdding(false); services.reload() }}
        onCancel={() => setAdding(false)}
      />}
    </Modal>

    <Modal open={!!editing} title={`Edit ${editing?.name ?? ''}`} onClose={() => setEditing(null)}>
      {editing && <ServiceForm
        existing={editing}
        onDone={() => { setEditing(null); services.reload() }}
        onCancel={() => setEditing(null)}
      />}
    </Modal>
  </>
}

function ServiceForm({ existing, onDone, onCancel }: {
  existing?: CatalogService
  onDone: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError('')
    try {
      if (existing) {
        await providerService.adminUpdateService(existing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim(),
        })
      } else {
        await providerService.adminCreateService({
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim(),
        })
      }
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <TextField label="Service name" value={name} onChange={e => setName(e.target.value)} required maxLength={150} />
    <TextField label="Category" value={category} onChange={e => setCategory(e.target.value)} required maxLength={100} placeholder="e.g. Electrical, Plumbing" />
    <TextAreaField label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending || !name.trim() || !category.trim()}>
        {pending ? 'Saving…' : existing ? 'Save changes' : 'Add service'}
      </ActionButton>
    </div>
  </form>
}