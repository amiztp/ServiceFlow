import { useState, type FormEvent } from 'react'
import {
  ActionButton, EmptyState, Modal, ResponsiveTable, SelectField,
  StatusBadge, TextField,
} from '../../components'
import { Notice, PageHeader, Resource, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { InvoiceRow, PaymentRow } from '../../types/provider'

// InvoiceRow has id: number — table needs id: string
type TableInvoice = Omit<InvoiceRow, 'id'> & { id: string }

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD_EXTERNAL' | 'OTHER'

const methodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CARD_EXTERNAL: 'Card (external)',
  OTHER: 'Other',
}

const money = (v: number) =>
  `LKR ${Number(v || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

// Compute status from amounts — InvoiceRow has no `status` field
function invoiceStatusOf(i: InvoiceRow): 'PAID' | 'PARTIAL' | 'UNPAID' {
  const row = i as any
  if (typeof row.status === 'string') return row.status
  if (typeof row.payment_status === 'string') return row.payment_status
  const total = Number(row.total_amount || 0)
  const paid = Number(row.paid_amount || 0)
  if (total > 0 && paid >= total) return 'PAID'
  if (paid > 0) return 'PARTIAL'
  return 'UNPAID'
}

const toBadge = (s: 'PAID' | 'PARTIAL' | 'UNPAID'): 'paid' | 'awaiting' | 'unpaid' =>
  s === 'PAID' ? 'paid' : s === 'PARTIAL' ? 'awaiting' : 'unpaid'

const getTotal = (i: InvoiceRow): number => Number((i as any).total_amount || 0)
const getPaid = (i: InvoiceRow): number => Number((i as any).paid_amount || 0)

export default function Invoices() {
  const invoices = useResource(() => providerService.listInvoices(), [])
  const [paying, setPaying] = useState<InvoiceRow | null>(null)

  return <>
    <PageHeader
      title="Invoices & Payments"
      description="View invoices and record offline payments."
    />
    <Resource {...invoices} retry={invoices.reload}>
      {invoices.data && (() => {
        const rows: InvoiceRow[] = Array.isArray(invoices.data)
          ? (invoices.data as InvoiceRow[])
          : (((invoices.data as any).items) as InvoiceRow[]) ?? []

        const unpaid = rows.filter(i => invoiceStatusOf(i) !== 'PAID')
        const paid = rows.filter(i => invoiceStatusOf(i) === 'PAID')
        const totalBilled = rows.reduce((s, i) => s + getTotal(i), 0)
        const totalPaid = rows.reduce((s, i) => s + getPaid(i), 0)
        const totalOutstanding = totalBilled - totalPaid

        // Table requires id: string — map number ids to strings
        const tableRows: TableInvoice[] = rows.map(i => ({
          ...(i as any),
          id: String((i as any).id),
        }))

        return <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="sf-card p-4">
              <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Outstanding</p>
              <p className="sf-tabular font-semibold text-lg mt-1">{money(totalOutstanding)}</p>
              <p className="text-xs text-text-secondary mt-1">{unpaid.length} invoice{unpaid.length === 1 ? '' : 's'}</p>
            </div>
            <div className="sf-card p-4">
              <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Collected</p>
              <p className="sf-tabular font-semibold text-lg mt-1">{money(totalPaid)}</p>
              <p className="text-xs text-text-secondary mt-1">{paid.length} paid</p>
            </div>
            <div className="sf-card p-4">
              <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Total billed</p>
              <p className="sf-tabular font-semibold text-lg mt-1">{money(totalBilled)}</p>
              <p className="text-xs text-text-secondary mt-1">{rows.length} invoice{rows.length === 1 ? '' : 's'}</p>
            </div>
            <div className="sf-card p-4">
              <p className="sf-mono text-[11px] uppercase tracking-wide text-text-secondary">Awaiting payment</p>
              <p className="sf-tabular font-semibold text-lg mt-1">{unpaid.length}</p>
              <p className="text-xs text-text-secondary mt-1">Action needed</p>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Completing a job creates an invoice automatically."
            />
          ) : (
            <ResponsiveTable
              caption="Invoices"
              rows={tableRows}
              columns={[
                {
                  key: 'number',
                  heading: 'Invoice #',
                  render: (i) => <span className="sf-mono text-xs">{(i as any).invoice_number}</span>,
                },
                {
                  key: 'job',
                  heading: 'Job',
                  render: (i) => <span className="sf-mono text-xs">#{(i as any).job_id}</span>,
                },
                {
                  key: 'total',
                  heading: 'Total',
                  render: (i) => (
                    <span className="sf-tabular font-semibold">
                      {money(Number((i as any).total_amount || 0))}
                    </span>
                  ),
                },
                {
                  key: 'paid',
                  heading: 'Paid',
                  render: (i) => (
                    <span className="sf-tabular">
                      {money(Number((i as any).paid_amount || 0))}
                    </span>
                  ),
                },
                {
                  key: 'balance',
                  heading: 'Balance',
                  render: (i) => {
                    const bal = Number((i as any).total_amount || 0) - Number((i as any).paid_amount || 0)
                    return (
                      <span className={`sf-tabular font-semibold ${bal > 0 ? 'text-[#B93832]' : ''}`}>
                        {money(bal)}
                      </span>
                    )
                  },
                },
                {
                  key: 'status',
                  heading: 'Status',
                  render: (i) => <StatusBadge status={toBadge(invoiceStatusOf(i as any))} />,
                },
                {
                  key: 'actions',
                  heading: '',
                  render: (i) => (
                    <div className="flex gap-2 flex-wrap">
                      {invoiceStatusOf(i as any) !== 'PAID' && (
                        <ActionButton
                          variant="stamp"
                          size="small"
                          onClick={() => setPaying(i as any)}
                        >
                          Record payment
                        </ActionButton>
                      )}
                      <ActionButton
                        variant="stub"
                        size="small"
                        onClick={() => providerService.downloadInvoicePdf((i as any).id)}
                      >
                        PDF
                      </ActionButton>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      })()}
    </Resource>

    <Modal open={!!paying} title="Record payment" onClose={() => setPaying(null)}>
      {paying && (
        <PaymentForm
          invoice={paying}
          onDone={() => { setPaying(null); invoices.reload() }}
          onCancel={() => setPaying(null)}
        />
      )}
    </Modal>
  </>
}

function PaymentForm({ invoice, onDone, onCancel }: {
  invoice: InvoiceRow
  onDone: () => void
  onCancel: () => void
}) {
  const invoiceId = (invoice as any).id
  const payments = useResource(
    () => providerService.listPayments(invoiceId),
    [invoiceId],
  )
  const total = getTotal(invoice)
  const paid = getPaid(invoice)
  const outstanding = Math.max(0, total - paid)
  const [amount, setAmount] = useState(String(outstanding.toFixed(2)))
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    try {
      await providerService.recordPayment(invoiceId, {
        amount: Number(amount),
        method,
        note: note.trim() || undefined,
      })
      onDone()
    } catch (c) {
      setError((c as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-docket border border-line bg-paper p-3 text-sm space-y-1">
        <p className="text-text-secondary text-xs">Invoice</p>
        <p className="font-semibold">{(invoice as any).invoice_number}</p>
        <p className="text-text-secondary mt-2 text-xs">Outstanding balance</p>
        <p className="sf-tabular font-semibold text-lg">{money(outstanding)}</p>
      </div>

      <Resource {...payments} retry={payments.reload}>
        {payments.data && (() => {
          const payRows: PaymentRow[] = Array.isArray(payments.data)
            ? (payments.data as PaymentRow[])
            : (((payments.data as any).items) as PaymentRow[]) ?? []
          if (payRows.length === 0) return null
          return (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Payment history</h3>
              <div className="space-y-2">
                {payRows.map((p) => {
                  const row = p as any
                  const label = methodLabels[row.method as PaymentMethod] ?? row.method ?? '—'
                  const when = row.paid_at ?? row.created_at ?? row.payment_date ?? ''
                  return (
                    <div
                      key={row.id}
                      className="text-sm border-b border-line pb-2 flex justify-between gap-2"
                    >
                      <span>
                        {label}
                        {row.note && ` · ${row.note}`}
                      </span>
                      <span className="sf-tabular text-right">
                        {money(Number(row.amount || 0))} · {formatDateTime(when)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </Resource>

      <form onSubmit={submit} className="space-y-3">
        <TextField
          label="Amount (LKR)"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          hint={`Maximum ${money(outstanding)} — partial payments leave a balance`}
        />
        <SelectField
          label="Payment method"
          value={method}
          onChange={e => setMethod(e.target.value as PaymentMethod)}
          required
        >
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CARD_EXTERNAL">Card (external)</option>
          <option value="OTHER">Other</option>
        </SelectField>
        <TextField
          label="Note (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        {error && <Notice error>{error}</Notice>}
        <div className="flex justify-end gap-2">
          <ActionButton variant="stub" onClick={onCancel} disabled={pending}>
            Cancel
          </ActionButton>
          <ActionButton
            type="submit"
            variant="stamp"
            disabled={pending || !amount || Number(amount) <= 0}
          >
            {pending ? 'Recording…' : 'Record payment'}
          </ActionButton>
        </div>
      </form>
    </div>
  )
}