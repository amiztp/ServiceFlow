import { useEffect, useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard,
  Tabs, TextAreaField, TextField,
} from '../../components'
import { Notice, PageHeader, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type {
  CatalogService, PolicyRow, Provider, ProviderOffering,
  ServiceArea, WorkingHour,
} from '../../types/provider'

const tabs = [
  { key: 'services', label: 'Services' },
  { key: 'areas', label: 'Service Areas' },
  { key: 'hours', label: 'Working Hours' },
  { key: 'policies', label: 'Policies' },
  { key: 'settings', label: 'Settings' },
] as const
type Tab = typeof tabs[number]['key']

export default function MyBusiness() {
  const [tab, setTab] = useState<Tab>('services')
  return <>
    <PageHeader title="My Business" description="Manage your offered services, availability and public profile." />
    <Tabs label="Business sections" items={tabs} value={tab} onChange={setTab}>
      {tab === 'services' && <ServicesTab />}
      {tab === 'areas' && <AreasTab />}
      {tab === 'hours' && <HoursTab />}
      {tab === 'policies' && <PoliciesTab />}
      {tab === 'settings' && <SettingsTab />}
    </Tabs>
  </>
}

// ---------- Services ----------
function ServicesTab() {
  const offerings = useResource(() => providerService.listMyOfferings())
  const catalog = useResource(() => providerService.listCatalogServices())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ProviderOffering | null>(null)

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">Pick services from the catalog and set your own price.</p>
      <ActionButton variant="stamp" onClick={() => setAdding(true)}>Add service</ActionButton>
    </div>
    <Resource {...offerings} retry={offerings.reload}>
      {offerings.data && offerings.data.length === 0
        ? <EmptyState title="No services yet" description="Add a service from the catalog to start receiving requests." />
        : <div className="space-y-3">{offerings.data?.map(o => (
            <SurfaceCard key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="sf-display font-semibold">
                  {o.service_name}
                  {!o.is_active && <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs text-text-secondary">Inactive</span>}
                  {!o.catalog_is_active && <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs text-text-secondary">Catalog retired</span>}
                </h3>
                {o.description && <p className="text-sm text-text-secondary">{o.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="sf-tabular font-semibold">LKR {Number(o.starting_price).toFixed(2)}</span>
                <ActionButton variant="stub" size="small" onClick={() => setEditing(o)}>Edit</ActionButton>
              </div>
            </SurfaceCard>
          ))}</div>}
    </Resource>
    <Modal open={adding} title="Add a service" onClose={() => setAdding(false)}>
      {adding && catalog.data && <AddOffering catalog={catalog.data} existing={offerings.data ?? []} onDone={() => { setAdding(false); offerings.reload() }} onCancel={() => setAdding(false)} />}
    </Modal>
    <Modal open={!!editing} title="Edit offering" onClose={() => setEditing(null)}>
      {editing && <EditOffering offering={editing} onDone={() => { setEditing(null); offerings.reload() }} onCancel={() => setEditing(null)} />}
    </Modal>
  </>
}

function AddOffering({ catalog, existing, onDone, onCancel }: {
  catalog: CatalogService[]; existing: ProviderOffering[]; onDone: () => void; onCancel: () => void
}) {
  const used = new Set(existing.map(o => o.service_id))
  const available = catalog.filter(c => c.is_active && !used.has(c.id))
  const [serviceId, setServiceId] = useState('')
  const [price, setPrice] = useState('0')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending || !serviceId) return
    setPending(true); setError('')
    try {
      await providerService.createOffering({
        service_id: Number(serviceId),
        starting_price: Number(price),
        description: description.trim() || undefined,
      })
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }
  return <form onSubmit={submit} className="space-y-4">
    {available.length === 0 ? <Notice error>All catalog services are already offered.</Notice> : <>
      <SelectField label="Service" value={serviceId} onChange={e => setServiceId(e.target.value)} required>
        <option value="">— Select —</option>
        {available.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </SelectField>
      <TextField label="Starting price (LKR)" type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
      <TextAreaField label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
    </>}
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending || !serviceId}>{pending ? 'Saving…' : 'Add'}</ActionButton>
    </div>
  </form>
}

function EditOffering({ offering, onDone, onCancel }: {
  offering: ProviderOffering; onDone: () => void; onCancel: () => void
}) {
  const [price, setPrice] = useState(offering.starting_price)
  const [description, setDescription] = useState(offering.description ?? '')
  const [isActive, setIsActive] = useState(offering.is_active)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError('')
    try {
      await providerService.updateOffering(offering.id, {
        starting_price: Number(price),
        description: description.trim(),
        is_active: isActive,
      })
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-text-secondary">Service: <strong>{offering.service_name}</strong></p>
    <TextField label="Starting price (LKR)" type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
    <TextAreaField label="Description" value={description} onChange={e => setDescription(e.target.value)} />
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
      Active (shown on your public profile)
    </label>
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Save'}</ActionButton>
    </div>
  </form>
}

// ---------- Service Areas ----------
function AreasTab() {
  const areas = useResource(() => providerService.listServiceAreas())
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function add(e: FormEvent) {
    e.preventDefault(); if (pending || !name.trim()) return
    setPending(true); setError('')
    try { await providerService.createServiceArea(name.trim()); setName(''); areas.reload() }
    catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }
  async function remove(id: number) {
    setError('')
    try { await providerService.deleteServiceArea(id); areas.reload() }
    catch (c) { setError((c as Error).message) }
  }
  return <>
    <SurfaceCard className="mb-4 p-4">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <TextField label="Add a service area" value={name} onChange={e => setName(e.target.value)} required maxLength={150} placeholder="e.g. Colombo 07" />
        </div>
        <ActionButton type="submit" variant="stamp" disabled={pending || !name.trim()}>{pending ? 'Adding…' : 'Add'}</ActionButton>
      </form>
      {error && <div className="mt-3"><Notice error>{error}</Notice></div>}
    </SurfaceCard>
    <Resource {...areas} retry={areas.reload}>
      {areas.data && areas.data.length === 0
        ? <EmptyState title="No service areas" description="Add the areas where you offer services." />
        : <div className="space-y-2">{areas.data?.map((a: ServiceArea) => (
            <SurfaceCard key={a.id} className="flex items-center justify-between p-3">
              <span>{a.area_name}</span>
              <ActionButton variant="void" size="small" onClick={() => remove(a.id)}>Remove</ActionButton>
            </SurfaceCard>
          ))}</div>}
    </Resource>
  </>
}

// ---------- Working Hours ----------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function HoursTab() {
  const hours = useResource(() => providerService.getWorkingHours())
  const [draft, setDraft] = useState<WorkingHour[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!hours.data) return
    setDraft(Array.from({ length: 7 }, (_, i) => hours.data!.find(h => h.day_of_week === i) ?? {
      day_of_week: i, start_time: null, end_time: null, is_closed: true,
    }))
  }, [hours.data])

  const update = (i: number, patch: Partial<WorkingHour>) =>
    setDraft(d => d.map((h, idx) => idx === i ? { ...h, ...patch } : h))

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      await providerService.saveWorkingHours(draft)
      setSaved(true); hours.reload()
    } catch (c) { setError((c as Error).message) } finally { setSaving(false) }
  }

  return <Resource {...hours} retry={hours.reload}>
    <SurfaceCard className="space-y-3 p-4">
      {draft.map((h, i) => {
        const open = !h.is_closed
        return <div key={h.day_of_week} className="flex flex-wrap items-center gap-3 border-b border-line pb-3 last:border-0">
          <span className="w-24 font-medium">{DAYS[h.day_of_week]}</span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={open}
              onChange={e => update(i, e.target.checked
                ? { is_closed: false, start_time: h.start_time ?? '09:00:00', end_time: h.end_time ?? '17:00:00' }
                : { is_closed: true, start_time: null, end_time: null })}
            />
            {open ? 'Open' : 'Closed'}
          </label>
          {open && <>
            <input
              type="time"
              className="sf-input w-32"
              value={(h.start_time ?? '').slice(0, 5)}
              onChange={e => update(i, { start_time: e.target.value + ':00' })}
            />
            <span>to</span>
            <input
              type="time"
              className="sf-input w-32"
              value={(h.end_time ?? '').slice(0, 5)}
              onChange={e => update(i, { end_time: e.target.value + ':00' })}
            />
          </>}
        </div>
      })}
      {error && <Notice error>{error}</Notice>}
      {saved && <Notice>Working hours saved.</Notice>}
      <div className="flex justify-end">
        <ActionButton variant="stamp" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save all 7 days'}</ActionButton>
      </div>
    </SurfaceCard>
  </Resource>
}

// ---------- Policies ----------
const POLICY_TYPES = [
  { value: 'SERVICE', label: 'Service policy' },
  { value: 'WARRANTY', label: 'Warranty' },
  { value: 'CANCELLATION', label: 'Cancellation' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'TERMS_AND_CONDITIONS', label: 'Terms & Conditions' },
] as const

function PoliciesTab() {
  const policies = useResource(() => providerService.listMyPolicies())
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<number | null>(null)

  async function remove(id: number) {
    setError('')
    try { await providerService.deletePolicy(id); policies.reload() }
    catch (c) { setError((c as Error).message) }
  }
  async function activate(id: number) {
    setError('')
    try { await providerService.activatePolicy(id); policies.reload() }
    catch (c) { setError((c as Error).message) }
  }
  async function download(id: number, title: string) {
    setDownloading(id); setError('')
    try { await providerService.downloadPolicy(id, title) }
    catch (c) { setError((c as Error).message) } finally { setDownloading(null) }
  }

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">One active policy per type. Only public policies are used by Flow AI.</p>
      <ActionButton variant="stamp" onClick={() => setAdding(true)}>Upload policy</ActionButton>
    </div>
    {error && <div className="mb-3"><Notice error>{error}</Notice></div>}
    <Resource {...policies} retry={policies.reload}>
      {policies.data && policies.data.length === 0
        ? <EmptyState title="No policies yet" description="Upload a PDF policy to publish your terms." />
        : <div className="space-y-3">{policies.data?.map((p: PolicyRow) => (
            <SurfaceCard key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="sf-display font-semibold">
                  {p.title}
                  <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs text-text-secondary">{p.visibility}</span>
                  <span className={`ml-2 rounded px-2 py-0.5 text-xs ${p.status === 'ACTIVE' ? 'bg-[var(--sf-success-bg)] text-[var(--sf-success)]' : 'bg-paper text-text-secondary'}`}>{p.status}</span>
                </h3>
                <p className="text-sm text-text-secondary">{p.policy_type.replaceAll('_', ' ')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  variant="stub"
                  size="small"
                  onClick={() => download(p.id, p.title)}
                  disabled={downloading === p.id}
                >
                  {downloading === p.id ? '…' : 'Download'}
                </ActionButton>
                {p.status !== 'ACTIVE' && <ActionButton variant="stub" size="small" onClick={() => activate(p.id)}>Activate</ActionButton>}
                <ActionButton variant="void" size="small" onClick={() => remove(p.id)}>Delete</ActionButton>
              </div>
            </SurfaceCard>
          ))}</div>}
    </Resource>
    <Modal open={adding} title="Upload policy" onClose={() => setAdding(false)}>
      {adding && <UploadPolicy onDone={() => { setAdding(false); policies.reload() }} onCancel={() => setAdding(false)} />}
    </Modal>
  </>
}

function UploadPolicy({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [policyType, setPolicyType] = useState<string>('SERVICE')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending || !file || !title.trim()) return
    setPending(true); setError('')
    try {
      const form = new FormData()
      form.append('title', title.trim())
      form.append('policy_type', policyType)
      form.append('visibility', visibility)
      form.append('file', file)
      await providerService.uploadPolicy(form)
      onDone()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div>
      <label className="mb-1 block text-sm font-medium">PDF file</label>
      <input type="file" accept="application/pdf" className="sf-input" onChange={e => setFile(e.target.files?.[0] ?? null)} />
    </div>
    <TextField label="Policy title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={200} />
    <SelectField label="Type" value={policyType} onChange={e => setPolicyType(e.target.value)}>
      {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
    </SelectField>
    <SelectField label="Visibility" value={visibility} onChange={e => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}>
      <option value="PUBLIC">Public — visible to clients and Flow AI</option>
      <option value="PRIVATE">Private — internal only</option>
    </SelectField>
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2">
      <ActionButton type="button" onClick={onCancel}>Cancel</ActionButton>
      <ActionButton type="submit" variant="stamp" disabled={pending || !file || !title.trim()}>
        {pending ? 'Uploading…' : 'Upload'}
      </ActionButton>
    </div>
  </form>
}

// ---------- Settings ----------
function SettingsTab() {
  const profile = useResource(() => providerService.getProfile())
  return <Resource {...profile} retry={profile.reload}>
    {profile.data && <SettingsForm provider={profile.data} onSaved={profile.reload} />}
  </Resource>
}

function SettingsForm({ provider, onSaved }: { provider: Provider; onSaved: () => void }) {
  const [name, setName] = useState(provider.name)
  const [description, setDescription] = useState(provider.description ?? '')
  const [phone, setPhone] = useState(provider.phone ?? '')
  const [address, setAddress] = useState(provider.address ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); if (pending) return
    setPending(true); setError(''); setSaved(false)
    try {
      await providerService.updateProfile({ name, description, phone, address })
      setSaved(true); onSaved()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  return <SurfaceCard className="max-w-xl p-5">
    <form onSubmit={submit} className="space-y-4">
      <TextField label="Business name" value={name} onChange={e => setName(e.target.value)} required />
      <TextAreaField label="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <TextField label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
      <TextField label="Address" value={address} onChange={e => setAddress(e.target.value)} />
      {error && <Notice error>{error}</Notice>}
      {saved && <Notice>Profile saved.</Notice>}
      <ActionButton type="submit" variant="stamp" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</ActionButton>
    </form>
  </SurfaceCard>
}