import { clientService } from './client-service'
import { demoAccount, requireDemo } from './demo-account'
import { ApiError, demoMode, liveApiMode, api } from './api'

export type Review = { id: string; client_id: string; company_id: string; job_id: string; author: string; rating: number; comment: string }
export type Dispute = { id: string; client_id: string; record_id: string; kind: 'request' | 'job'; reason: string; description?: string; status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'; created_at: string }
type ApiRating = { job_id: number; rating: number; review_text?: string | null; reviewed_at: string }
type ApiDispute = { id: number; job_id: number; opened_by: number; reason: string; description: string; status: string; admin_note?: string | null; created_at: string; closed_at?: string | null }
const reviews: Review[] = []
const disputes: Dispute[] = []
const live = () => liveApiMode || !demoMode

function mapDispute(value: ApiDispute): Dispute {
  return { id: String(value.id), client_id: '', record_id: String(value.job_id), kind: 'job', reason: value.reason, description: value.description, status: value.status as Dispute['status'], created_at: value.created_at }
}

export const clientFeedback = {
  async publicReviews(companyId: string) {
    if (live()) return structuredClone([] as Review[])
    requireDemo('Public reviews')
    return structuredClone(reviews.filter(review => review.company_id === companyId))
  },
  async reviewForJob(jobId: string) {
    if (live()) return null
    requireDemo('Reviews')
    return structuredClone(reviews.find(review => review.job_id === jobId && review.client_id === demoAccount.id()) || null)
  },
  async review(jobId: string, rating: number, comment: string) {
    if (live()) {
      const job = await clientService.job(jobId)
      if (job.status !== 'COMPLETED') throw new ApiError('Only completed jobs can be reviewed.', 409)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.trim().length < 10) throw new ApiError('Choose a rating and enter at least 10 characters.', 422)
      const saved = await api<ApiRating>(`/jobs/${encodeURIComponent(jobId)}/rating`, 'POST', { rating, review_text: comment.trim() })
      const me = await clientService.me()
      const request = await clientService.request(job.request_id)
      const review: Review = { id: `SF-REV-${saved.job_id}`, client_id: me.id, company_id: request.company_id, job_id: jobId, author: me.name, rating: saved.rating, comment: saved.review_text || comment.trim() }
      return structuredClone(review)
    }
    requireDemo('Reviews')
    const job = await clientService.job(jobId)
    if (job.status !== 'COMPLETED') throw new ApiError('Only completed jobs can be reviewed.', 409)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.trim().length < 10) throw new ApiError('Choose a rating and enter at least 10 characters.', 422)
    if (await clientFeedback.reviewForJob(jobId)) throw new ApiError('You have already reviewed this job.', 409)
    const request = await clientService.request(job.request_id)
    const review: Review = { id: crypto.randomUUID(), client_id: demoAccount.me().id, company_id: request.company_id, job_id: jobId, author: demoAccount.me().name, rating, comment: comment.trim() }
    reviews.push(review)
    return structuredClone(review)
  },
  async disputes(kind: 'request' | 'job', recordId: string) {
    if (live()) {
      if (kind !== 'job') return structuredClone([] as Dispute[])
      const rows = await api<ApiDispute[]>('/disputes/mine?limit=100')
      return structuredClone(rows.filter(row => String(row.job_id) === recordId).map(mapDispute))
    }
    requireDemo('Disputes')
    return structuredClone(disputes.filter(dispute => dispute.client_id === demoAccount.id() && dispute.kind === kind && dispute.record_id === recordId))
  },
  async myDisputes() {
    if (live()) {
      const rows = await api<ApiDispute[]>('/disputes/mine?limit=100')
      return structuredClone(rows.map(mapDispute))
    }
    requireDemo('Disputes')
    return structuredClone(disputes.filter(dispute => dispute.client_id === demoAccount.id()))
  },
  async dispute(kind: 'request' | 'job', recordId: string, reason: string) {
    if (live()) {
      if (kind !== 'job') throw new ApiError('Disputes can only be opened on a completed job.', 422)
      const job = await clientService.job(recordId)
      if (job.status !== 'COMPLETED') throw new ApiError('Disputes can only be opened on a completed job.', 409)
      const text = reason.trim()
      if (text.length < 10) throw new ApiError('Describe the issue in at least 10 characters.', 422)
      const short = text.length <= 150 ? text : `${text.slice(0, 147)}...`
      const saved = await api<ApiDispute>(`/jobs/${encodeURIComponent(recordId)}/disputes`, 'POST', { reason: short, description: text })
      return structuredClone(mapDispute(saved))
    }
    requireDemo('Disputes')
    if (kind === 'request') await clientService.request(recordId)
    else await clientService.job(recordId)
    if (reason.trim().length < 10) throw new ApiError('Describe the issue in at least 10 characters.', 422)
    if ((await clientFeedback.disputes(kind, recordId)).length) throw new ApiError('An open dispute already exists for this record.', 409)
    const dispute: Dispute = { id: crypto.randomUUID(), client_id: demoAccount.me().id, record_id: recordId, kind, reason: reason.trim(), status: 'OPEN', created_at: new Date().toISOString() }
    disputes.push(dispute)
    return structuredClone(dispute)
  },
}
