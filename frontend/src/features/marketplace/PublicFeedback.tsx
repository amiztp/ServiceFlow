import { SurfaceCard } from '../../components'
import { Notice, Resource, useResource } from '../../components/client-shared'
import { clientFeedback } from '../../lib/client-feedback'
import { demoMode } from '../../lib/api'

export function PublicFeedback({ companyId }: { companyId: string }) {
  const resource = useResource(() => demoMode ? clientFeedback.publicReviews(companyId) : Promise.resolve(null), [companyId])
  const reviews = resource.data || []
  const rating = reviews.length ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1) : null
  return <SurfaceCard className="space-y-4 p-6">
    <h2 className="sf-display text-xl font-semibold">Client reviews</h2>
    <Resource {...resource} retry={resource.reload}>
      {!demoMode ? <Notice>Ratings, reviews and completed-job totals await the public company API.</Notice> : <>
        <p className="text-sm text-text-secondary">{rating ? `${rating} / 5 from ${reviews.length} sample review(s)` : 'No sample reviews yet.'} Verified public job totals will come from the backend.</p>
        {reviews.map(review => <article key={review.id} className="space-y-2 border-t border-line pt-4">
          <p className="font-semibold">{review.author} · {review.rating} / 5</p>
          <p className="whitespace-pre-wrap">{review.comment}</p>
          <p className="sf-mono text-xs text-text-secondary">Completed sample job</p>
        </article>)}
      </>}
    </Resource>
  </SurfaceCard>
}
