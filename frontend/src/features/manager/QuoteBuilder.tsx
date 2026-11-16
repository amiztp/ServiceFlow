import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ActionButton, SurfaceCard, TextAreaField, TextField,
} from '../../components'
import {
  Notice, PageHeader, RecordStatus, Resource, useResource,
} from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { QuotationItem, QuotationRow, RequestRow } from '../../types/provider'

export default function QuoteBuilder() {
  const { requestId } = useParams<{ requestId: string }>()
  const id = Number(requestId)
  if (!id || Number.isNaN(id)) return <p className="p-6">Invalid request.</p>

  const request = useResource(() => providerService.getRequest(id), [id])
  const quotations = useResource(() => providerService.listQuotations(id), [id])

  return <>
    <PageHeader title="Build quotation" description={`For request #${id}`}>
      <Link to="/manager/requests" className="sf-link">← Back to requests</Link>
    </PageHeader>

    <Resource {...request} retry={request.reload}>
      {request.data && <RequestSummary request={request.data} />}
    </Resource>

    <div className="mt-6">
      <Resource {...quotations} retry={quotations.reload}>
        <QuoteSection
          requestId={id}
          quotations={quotations.data ?? []}
          onChanged={quotations.reload}
        />
      </Resource>
    </div>
  </>
}

function RequestSummary({ request }: { request: RequestRow }) {
  return <SurfaceCard className="space-y-2 p-5">
    <div className="flex items-center gap-3">
      <RecordStatus status={request.status} />
      <span className="sf-mono text-xs text-text-secondary">#{request.id}</span>
    </div>
    <p className="whitespace-pre-wrap">{request.description}</p>
    <p className="text-sm text-text-secondary">
      Preferred {request.preferred_date}
      {request.preferred_time ? ` ${request.preferred_time.slice(0, 5)}` : ''} · {request.address}
    </p>
  </SurfaceCard>
}

function QuoteSection({ requestId, quotations, onChanged }: {
  requestId: number
  quotations: QuotationRow[]
  onChanged: () => void
}) {
  const draft = quotations.find(q => q.status === 'DRAFT')
  const sent = quotations.find(q => q.status === 'SENT' || q.status === 'APPROVED' || q.status === 'DECLINED')

  if (sent) return <SentQuotation quotation={sent} />
  return <QuotationForm requestId={requestId} existingDraft={draft} onSaved={onChanged} />
}

function SentQuotation({ quotation }: { quotation: QuotationRow }) {
  return <SurfaceCard className="space-y-3 p-5">
    <div className="flex items-center justify-between">
      <h2 className="sf-display text-xl font-semibold">Quotation #{quotation.id}</h2>
      <RecordStatus status={quotation.status} />
    </div>
    <ItemTable items={quotation.items} />
    <div className="flex justify-between border-t border-line pt-3">
      <span className="sf-mono text-sm">TOTAL</span>
      <strong className="sf-tabular text-lg">LKR {Number(quotation.total_amount).toFixed(2)}</strong>
    </div>
    <p className="text-sm text-text-secondary">
      Valid until {new Date(quotation.valid_until).toLocaleString('en-GB')}
    </p>
    {quotation.note && <p className="text-sm">{quotation.note}</p>}
    <Notice>
      {quotation.status === 'SENT'
        ? 'Sent — waiting for the client to approve or decline.'
        : quotation.status === 'APPROVED'
        ? 'Approved by the client. A job has been created.'
        : 'Declined by the client.'}
    </Notice>
  </SurfaceCard>
}

function ItemTable({ items }: { items: QuotationRow['items'] }) {
  return <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead><tr className="sf-mono border-b border-border text-xs">
        <th className="py-2">Description</th>
        <th className="px-2 py-2 text-right">Qty</th>
        <th className="px-2 py-2 text-right">Unit price</th>
        <th className="py-2 text-right">Line total</th>
      </tr></thead>
      <tbody>{items.map(i => <tr key={i.id} className="border-b border-line">
        <td className="py-2">{i.description}</td>
        <td className="sf-tabular px-2 text-right">{i.quantity}</td>
        <td className="sf-tabular px-2 text-right">{Number(i.unit_price).toFixed(2)}</td>
        <td className="sf-tabular text-right">{Number(i.line_total).toFixed(2)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

type FormItem = { description: string; quantity: string; unit_price: string }

function QuotationForm({ requestId, existingDraft, onSaved }: {
  requestId: number
  existingDraft?: QuotationRow
  onSaved: () => void
}) {
  const [items, setItems] = useState<FormItem[]>(() =>
    existingDraft
      ? existingDraft.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
      : [{ description: '', quantity: '1', unit_price: '0' }]
  )
  const [validUntil, setValidUntil] = useState(() =>
    existingDraft
      ? toLocalInput(existingDraft.valid_until)
      : toLocalInput(new Date(Date.now() + 7 * 86400000).toISOString())
  )
  const [downpayment, setDownpayment] = useState(existingDraft?.downpayment_amount ?? '')
  const [note, setNote] = useState(existingDraft?.note ?? '')
  const [pending, setPending] = useState<'draft' | 'send' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const total = items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0)

  function updateItem(i: number, patch: Partial<FormItem>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItem() { setItems(prev => [...prev, { description: '', quantity: '1', unit_price: '0' }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  function validate(): string | null {
    if (items.length === 0) return 'Add at least one line item.'
    for (const it of items) {
      if (!it.description.trim()) return 'Every line needs a description.'
      if (Number(it.quantity) <= 0) return 'Quantity must be greater than 0.'
      if (Number(it.unit_price) < 0) return 'Unit price cannot be negative.'
    }
    if (!validUntil) return 'Set a validity date.'
    if (downpayment && Number(downpayment) < 0) return 'Downpayment cannot be negative.'
    return null
  }

  async function save(send: boolean) {
    const v = validate()
    if (v) { setError(v); return }
    setPending(send ? 'send' : 'draft'); setError(''); setSuccess('')

    const lineItems: QuotationItem[] = items.map(i => ({
      description: i.description.trim(),
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }))
    const payload = {
      items: lineItems,
      valid_until: new Date(validUntil).toISOString(),
      downpayment_amount: downpayment ? Number(downpayment) : undefined,
      note: note.trim() || undefined,
    }

    try {
      const q = existingDraft
        ? await providerService.updateQuotation(existingDraft.id, payload)
        : await providerService.createQuotation(requestId, payload)

      if (send) {
        await providerService.sendQuotation(q.id)
        setSuccess('Quotation sent to client.')
      } else {
        setSuccess('Draft saved.')
      }
      onSaved()
    } catch (c) {
      setError((c as Error).message)
    } finally {
      setPending(null)
    }
  }

  return <SurfaceCard className="space-y-4 p-5">
    <h2 className="sf-display text-xl font-semibold">
      {existingDraft ? `Edit draft quotation #${existingDraft.id}` : 'Create quotation'}
    </h2>

    <div className="space-y-2">
      <h3 className="font-semibold">Line items</h3>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-12 items-start gap-2">
          <div className="col-span-6">
            <TextField
              label={i === 0 ? 'Description' : ''}
              value={it.description}
              onChange={e => updateItem(i, { description: e.target.value })}
              required
            />
          </div>
          <div className="col-span-2">
            <TextField
              label={i === 0 ? 'Qty' : ''}
              type="number" min={0} step="0.01"
              value={it.quantity}
              onChange={e => updateItem(i, { quantity: e.target.value })}
              required
            />
          </div>
          <div className="col-span-3">
            <TextField
              label={i === 0 ? 'Unit price' : ''}
              type="number" min={0} step="0.01"
              value={it.unit_price}
              onChange={e => updateItem(i, { unit_price: e.target.value })}
              required
            />
          </div>
          <div className={`col-span-1 flex ${i === 0 ? 'pt-7' : 'pt-1'}`}>
            {items.length > 1 && (
              <ActionButton variant="void" size="small" onClick={() => removeItem(i)} aria-label="Remove line">
                ×
              </ActionButton>
            )}
          </div>
        </div>
      ))}
      <ActionButton variant="stub" size="small" onClick={addItem}>+ Add line</ActionButton>
    </div>

    <div className="flex justify-between border-t border-line pt-3">
      <span className="sf-mono text-sm">TOTAL</span>
      <strong className="sf-tabular text-lg">LKR {total.toFixed(2)}</strong>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField
        label="Valid until"
        type="datetime-local"
        value={validUntil}
        onChange={e => setValidUntil(e.target.value)}
        required
      />
      <TextField
        label="Downpayment (optional)"
        type="number" min={0} step="0.01"
        value={downpayment}
        onChange={e => setDownpayment(e.target.value)}
      />
    </div>

    <TextAreaField label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />

    {error && <Notice error>{error}</Notice>}
    {success && <Notice>{success}</Notice>}

    <div className="flex flex-wrap justify-end gap-2">
      <ActionButton onClick={() => save(false)} disabled={!!pending}>
        {pending === 'draft' ? 'Saving…' : 'Save draft'}
      </ActionButton>
      <ActionButton variant="stamp" onClick={() => save(true)} disabled={!!pending}>
        {pending === 'send' ? 'Sending…' : 'Send to client'}
      </ActionButton>
    </div>
  </SurfaceCard>
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}