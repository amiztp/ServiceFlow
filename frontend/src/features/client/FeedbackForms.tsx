import { useState, type FormEvent } from 'react'
import { ActionButton, SelectField, SurfaceCard, TextAreaField } from '../../components'
import { Notice, Resource, useResource } from '../../components/client-shared'
import { clientFeedback } from '../../lib/client-feedback'
import { demoMode } from '../../lib/api'

export function ReviewForm({ jobId }: { jobId: string }) {
  const resource = useResource(() => clientFeedback.reviewForJob(jobId), [jobId])
  const [rating, setRating] = useState('5')
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try { await clientFeedback.review(jobId, Number(rating), comment); resource.reload() }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }
  return <SurfaceCard className="max-w-3xl space-y-5 p-6">
    <h2 className="sf-display text-xl font-semibold">Review your completed service</h2>
    {!demoMode ? <Notice>Reviews are awaiting a backend API.</Notice> : <Resource {...resource} retry={resource.reload}>
      {resource.data ? <Notice>Your sample review was saved. {resource.data.rating} / 5 — {resource.data.comment}</Notice> : <form className="space-y-5" onSubmit={submit}>
        <Notice>Sample reviews appear on the company profile during this demo session.</Notice>
        <SelectField label="Rating" value={rating} onChange={event => setRating(event.target.value)}>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} out of 5</option>)}</SelectField>
        <TextAreaField label="Your review" required minLength={10} maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} />
        {error && <Notice error>{error}</Notice>}
        <ActionButton variant="stamp" type="submit" disabled={pending || comment.trim().length < 10}>{pending ? 'Saving…' : 'Submit review'}</ActionButton>
      </form>}
    </Resource>}
  </SurfaceCard>
}

export function DisputeForm({ kind, recordId }: { kind: 'request' | 'job'; recordId: string }) {
  const resource = useResource(() => clientFeedback.disputes(kind, recordId), [kind, recordId])
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try { await clientFeedback.dispute(kind, recordId, reason); resource.reload() }
    catch (cause) { setError((cause as Error).message) }
    finally { setPending(false) }
  }
  return <SurfaceCard className="max-w-3xl p-6">
    <details>
      <summary className="cursor-pointer font-semibold">Report an issue with this {kind}</summary>
      <div className="mt-5 space-y-5">
        {!demoMode ? <Notice>Disputes are awaiting a backend API.</Notice> : <Resource {...resource} retry={resource.reload}>
          {resource.data?.length ? resource.data.map(dispute => <Notice key={dispute.id}>Sample dispute open · {dispute.reason}</Notice>) : <form className="space-y-5" onSubmit={submit}>
            <Notice>This sample submission does not notify the company or an administrator.</Notice>
            <TextAreaField label="Describe the issue" required minLength={10} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} />
            {error && <Notice error>{error}</Notice>}
            <ActionButton variant="stamp" type="submit" disabled={pending || reason.trim().length < 10}>{pending ? 'Submitting…' : 'Submit dispute'}</ActionButton>
          </form>}
        </Resource>}
      </div>
    </details>
  </SurfaceCard>
}
