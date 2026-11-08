import { clientService } from './client-service'
import { demoAccount, requireDemo } from './demo-account'
import { ApiError } from './api'

export type Review = { id: string; client_id: string; company_id: string; job_id: string; author: string; rating: number; comment: string }
export type Dispute = { id: string; client_id: string; record_id: string; kind: 'request' | 'job'; reason: string; status: 'OPEN'; created_at: string }
const reviews: Review[] = []
const disputes: Dispute[] = []

export const clientFeedback = {
  async publicReviews(companyId: string) {
    requireDemo('Public reviews')
    return structuredClone(reviews.filter(review => review.company_id === companyId))
  },
  async reviewForJob(jobId: string) {
    requireDemo('Reviews')
    return structuredClone(reviews.find(review => review.job_id === jobId && review.client_id === demoAccount.id()) || null)
  },
  async review(jobId: string, rating: number, comment: string) {
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
    requireDemo('Disputes')
    return structuredClone(disputes.filter(dispute => dispute.client_id === demoAccount.id() && dispute.kind === kind && dispute.record_id === recordId))
  },
  async dispute(kind: 'request' | 'job', recordId: string, reason: string) {
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
