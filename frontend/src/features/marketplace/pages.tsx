import { Link, useParams } from 'react-router-dom'
import { EmptyState, SurfaceCard } from '../../components'
import { money, PageHeader, Resource, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import { demoMode } from '../../lib/api'
import { ClientFlowAI } from './ClientFlowAI'
import { PublicFeedback } from './PublicFeedback'
export { NewRequestPage } from './RequestForm'

export function CompanyPage() {
  const { id = '' } = useParams()
  const resource = useResource(() => clientService.company(id), [id])
  const company = resource.data
  return <Resource {...resource} retry={resource.reload}>
    {company && <>
      <Link to="/companies" className="sf-link mb-6 inline-block">← All companies</Link>
      <PageHeader eyebrow={company.category} title={company.name} description={company.description} />
      <div className="grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <SurfaceCard className="p-6">
            <h2 className="sf-display mb-4 text-xl font-semibold">Services</h2>
            {company.offerings.filter(offering => offering.active).map(offering => <div key={offering.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-5">
              <div><h3 className="font-semibold">{offering.name}</h3><p className="mt-1 text-sm text-text-secondary">Starting from {money(offering.starting_price)}</p></div>
              <Link className="sf-link" to={`/companies/${encodeURIComponent(id)}/request?service=${encodeURIComponent(offering.id)}`}>Request service →</Link>
            </div>)}
            {!company.offerings.some(offering => offering.active) && <EmptyState title="No active services yet" description="This provider has not published any services. Ask the provider manager to add an active offering before sending a request." />}
          </SurfaceCard>
          <SurfaceCard className="space-y-4 p-6">
            <h2 className="sf-display text-xl font-semibold">Company details</h2>
            <p>{company.location}</p>
            <a className="sf-link block" href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>
            <a className="sf-link block break-all" href={`mailto:${company.email}`}>{company.email}</a>
            <h3 className="font-semibold">Focus areas</h3>
            <ul className="list-inside list-disc text-sm text-text-secondary">
              {(company.focus_areas || [company.category]).map(area => <li key={area}>{area}</li>)}
            </ul>
            {company.completed_jobs !== undefined && <p className="font-semibold">{company.completed_jobs} completed {demoMode ? 'sample ' : ''}job(s)</p>}
            {company.rating !== null && company.rating !== undefined && <p className="font-semibold">{company.rating.toFixed(1)} / 5 · {company.review_count || 0} review{(company.review_count || 0) === 1 ? '' : 's'}</p>}
          </SurfaceCard>
          <PublicFeedback companyId={id} />
        </div>
        <aside className="space-y-5">
          <SurfaceCard className="p-6">
            <h2 className="sf-display mb-3 text-xl font-semibold">Public policy</h2>
            {(company.policies || []).length ? <ul className="space-y-2">{company.policies!.map(policy => <li key={policy.id} className="text-sm">{policy.title} <span className="text-text-secondary">· {policy.policy_type}</span></li>)}</ul> : <p className="text-sm text-text-secondary">This company has not published a public policy.</p>}
          </SurfaceCard>
          <SurfaceCard className="p-6"><ClientFlowAI key={id} companyId={id} /></SurfaceCard>
        </aside>
      </div>
    </>}
  </Resource>
}
