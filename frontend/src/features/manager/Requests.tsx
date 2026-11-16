import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ActionButton, EmptyState, Modal, SelectField, SurfaceCard, TextAreaField,
} from '../../components'
import { Notice, PageHeader, RecordStatus, Resource, dateTime, useResource } from '../../components/client-shared'
import { providerService } from '../../lib/provider-service'
import type { RequestAttachmentRow, RequestMessage } from '../../types/provider'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'NEED_INFORMATION', label: 'Needs information' },
  { value: 'QUOTATION_SENT', label: 'Quotation sent' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function RequestInbox() {
  const [status, setStatus] = useState('')
  const resource = useResource(() => providerService.listIncomingRequests(status || undefined), [status])
  const [openId, setOpenId] = useState<number | null>(null)

  return <>
    <PageHeader title="Requests" description="Customer requests addressed to your business." />
    <div className="mb-5 max-w-xs">
      <SelectField label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </SelectField>
    </div>
    <Resource {...resource} retry={resource.reload}>
      {resource.data && resource.data.items.length === 0
        ? <EmptyState title="No requests" description={status ? 'No requests with this status.' : 'New customer requests will appear here.'} />
        : <div className="space-y-3">
            {resource.data?.items.map(r => (
              <SurfaceCard key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="sf-mono text-xs text-text-secondary">#{r.id}</span>
                    <RecordStatus status={r.status} />
                  </div>
                  <p className="line-clamp-1">{r.description}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Preferred {r.preferred_date}{r.preferred_time ? ` ${r.preferred_time.slice(0, 5)}` : ''} · {r.address}
                  </p>
                </div>
                <ActionButton variant="stub" size="small" onClick={() => setOpenId(r.id)}>Open</ActionButton>
              </SurfaceCard>
            ))}
          </div>}
    </Resource>
    <Modal open={openId !== null} title="Request details" onClose={() => setOpenId(null)}>
      {openId !== null && <RequestDetail id={openId} onClose={() => { setOpenId(null); resource.reload() }} />}
    </Modal>
  </>
}

function RequestDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const req = useResource(() => providerService.getRequest(id), [id])
  const msgs = useResource(() => providerService.listMessages(id), [id])
  const atts = useResource(() => providerService.listRequestAttachments(id).catch(() => [] as RequestAttachmentRow[]), [id])
  const [action, setAction] = useState<'review' | 'info' | 'reject' | null>(null)
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)

  async function runAction() {
    if (pending || !action) return
    setPending(true); setError('')
    try {
      if (action === 'review') await providerService.reviewRequest(id)
      else if (action === 'info') await providerService.requestInformation(id, text.trim())
      else if (action === 'reject') await providerService.rejectRequest(id, text.trim())
      setAction(null); setText(''); req.reload()
      if (action === 'reject') onClose()
    } catch (c) { setError((c as Error).message) } finally { setPending(false) }
  }

  async function sendMsg(e: FormEvent) {
    e.preventDefault(); if (sendingMsg || !messageText.trim()) return
    setSendingMsg(true); setError('')
    try { await providerService.sendMessage(id, messageText.trim()); setMessageText(''); msgs.reload() }
    catch (c) { setError((c as Error).message) } finally { setSendingMsg(false) }
  }

  return <Resource {...req} retry={req.reload}>
    {req.data && <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <RecordStatus status={req.data.status} />
          <span className="sf-mono text-xs text-text-secondary">#{req.data.id}</span>
        </div>
        <p className="whitespace-pre-wrap">{req.data.description}</p>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-text-secondary">Preferred date:</span> {req.data.preferred_date}</div>
          {req.data.preferred_time && <div><span className="text-text-secondary">Preferred time:</span> {req.data.preferred_time.slice(0, 5)}</div>}
          <div className="sm:col-span-2"><span className="text-text-secondary">Address:</span> {req.data.address}</div>
        </div>
        {req.data.rejection_reason && <Notice error>Rejected: {req.data.rejection_reason}</Notice>}
        {req.data.cancellation_reason && <Notice>Cancelled: {req.data.cancellation_reason}</Notice>}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {req.data.status === 'NEW' && <ActionButton variant="stamp" onClick={() => setAction('review')}>Start review</ActionButton>}
        {['NEW', 'UNDER_REVIEW', 'NEED_INFORMATION'].includes(req.data.status) && <>
          <ActionButton onClick={() => { setAction('info'); setText('') }}>Ask for information</ActionButton>
          <ActionButton variant="void" onClick={() => { setAction('reject'); setText('') }}>Reject</ActionButton>
          <Link to={`/manager/quotations/${id}`} className="sf-action inline-flex items-center justify-center gap-2 rounded-docket sf-stamp min-h-11 px-5 text-sm font-semibold">Create quotation</Link>
        </>}
        {req.data.status === 'QUOTATION_SENT' && <Notice>Quotation sent — waiting for client approval.</Notice>}
      </div>

      {action && <SurfaceCard className="mt-4 space-y-3 p-4">
        <h3 className="font-semibold">{action === 'review' ? 'Start review' : action === 'info' ? 'Ask for more information' : 'Reject this request'}</h3>
        {action !== 'review' && <TextAreaField
          label={action === 'info' ? 'Message to client' : 'Reason for rejection'}
          value={text}
          onChange={e => setText(e.target.value)}
          required
        />}
        {error && <Notice error>{error}</Notice>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={() => { setAction(null); setError('') }}>Cancel</ActionButton>
          <ActionButton variant="stamp" onClick={runAction} disabled={pending || (action !== 'review' && !text.trim())}>
            {pending ? 'Saving…' : 'Confirm'}
          </ActionButton>
        </div>
      </SurfaceCard>}

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="mb-3 font-semibold">Attachments</h3>
        <Resource {...atts} retry={atts.reload}>
          {atts.data && atts.data.length === 0
            ? <p className="text-sm text-text-secondary">No attachments from the client.</p>
            : <div className="space-y-2">{atts.data?.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-docket border border-line bg-paper p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.file_name}</p>
                    <p className="text-xs text-text-secondary">{a.content_type} · {dateTime(a.created_at)}</p>
                  </div>
                  <ActionButton variant="stub" size="small" onClick={() => providerService.downloadRequestAttachment(id, a.id, a.file_name)}>
                    Download
                  </ActionButton>
                </div>
              ))}</div>}
        </Resource>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="mb-3 font-semibold">Conversation</h3>
        <Resource {...msgs} retry={msgs.reload}>
          {msgs.data && msgs.data.length === 0
            ? <p className="text-sm text-text-secondary">No messages yet.</p>
            : <div className="space-y-2">{msgs.data?.map((m: RequestMessage) => (
                <div key={m.id} className="rounded-docket border border-line bg-paper p-3 text-sm">
                  <div className="mb-1 flex justify-between text-xs text-text-secondary">
                    <span>User #{m.sender_user_id}</span>
                    <span>{dateTime(m.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.message_text}</p>
                </div>
              ))}</div>}
        </Resource>
        <form onSubmit={sendMsg} className="mt-3 space-y-2">
          <TextAreaField label="Reply" value={messageText} onChange={e => setMessageText(e.target.value)} />
          {error && <Notice error>{error}</Notice>}
          <div className="flex justify-end">
            <ActionButton type="submit" variant="stamp" disabled={sendingMsg || !messageText.trim()}>
              {sendingMsg ? 'Sending…' : 'Send message'}
            </ActionButton>
          </div>
        </form>
      </div>
    </>}
  </Resource>
}