import { Link, useParams } from 'react-router-dom'
import { SurfaceCard } from '../../components'
import { money, PageHeader, Resource, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import { demoMode } from '../../lib/api'
import { ClientFlowAI } from './ClientFlowAI'
import { PublicFeedback } from './PublicFeedback'
export { NewRequestPage } from './RequestForm'

export function CompanyPage() {
  const { id = '' } = useParams()
  const resource = useResource(() => clientService.company(id), [id])
  const policy = useResource(() => clientService.policy(id), [id])
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
          </SurfaceCard>
          <PublicFeedback companyId={id} />
        </div>
        <aside className="space-y-5">
          <SurfaceCard className="p-6">
            <h2 className="sf-display mb-3 text-xl font-semibold">Public policy</h2>
            <Resource {...policy} retry={policy.reload}>
              {policy.data ? <a href={policy.data.url} className="sf-link" target="_blank" rel="noreferrer">{policy.data.title} ↗</a> : <p className="text-sm text-text-secondary">This company has not published a public policy.</p>}
            </Resource>
          </SurfaceCard>
          <SurfaceCard className="p-6"><ClientFlowAI key={id} companyId={id} /></SurfaceCard>
        </aside>
      </div>
    </>}
  </Resource>
}
