import { useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ActionButton, Modal, SelectField, Tabs } from '../../components'
import { Resource, useResource } from '../../components/client-shared'
import { clientService } from '../../lib/client-service'
import { DashboardPage } from './DashboardPage'
import { InvoiceDetailPage, JobDetailPage, QuoteDetailPage, RecordsPage, RequestDetailPage } from './pages'
import { ProfileSettings } from './ProfileSettings'
import { NewRequestPage } from '../marketplace/RequestForm'
import { ClientFlowAI } from '../marketplace/ClientFlowAI'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'requests', label: 'Requests' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'profile', label: 'Profile / Settings' },
] as const
type Tab = typeof tabs[number]['key']

export function LegacyClientRoute({ tab }: { tab: Tab }) {
  const { id } = useParams()
  const query = new URLSearchParams({ tab })
  if (id) query.set('record', id)
  return <Navigate to={`/client?${query}`} replace />
}

export function RequestEntryRoute() {
  const { id = '' } = useParams()
  const [search] = useSearchParams()
  const query = new URLSearchParams({ tab: 'requests', action: 'new', company: id })
  if (search.get('service')) query.set('service', search.get('service')!)
  return <Navigate to={`/client?${query}`} replace />
}

export function ClientDashboardPage() {
  const [search, setSearch] = useSearchParams()
  const tab: Tab = tabs.find(value => value.key === search.get('tab'))?.key || 'overview'
  const record = search.get('record') || ''
  const creating = tab === 'requests' && search.get('action') === 'new'
  const [revision, setRevision] = useState(0)

  function selectTab(next: Tab) { setSearch(next === 'overview' ? {} : { tab: next }) }
  function closeRequest() { setSearch({ tab: 'requests' }) }
  function created(id: string) {
    setRevision(current => current + 1)
    setSearch({ tab: 'requests', record: id })
  }
  return <>
    <Tabs label="Client dashboard sections" items={tabs} value={tab} onChange={selectTab}>
    <section key={`${tab}-${revision}`} aria-label={`${tabs.find(value => value.key === tab)?.label} content`}>
      {tab === 'overview' && <DashboardPage />}
      {tab === 'profile' && <ProfileSettings />}
      {tab === 'requests' && <div className="mb-5"><ActionButton variant="stamp" onClick={() => setSearch({ tab: 'requests', action: 'new' })}>Create new request</ActionButton></div>}
      {tab === 'requests' && (record ? <RequestDetailPage key={record} recordId={record} /> : <RecordsPage kind="requests" />)}
      {tab === 'quotations' && (record ? <QuoteDetailPage key={record} recordId={record} /> : <RecordsPage kind="quotations" />)}
      {tab === 'jobs' && (record ? <JobDetailPage key={record} recordId={record} /> : <RecordsPage kind="jobs" />)}
      {tab === 'invoices' && (record ? <InvoiceDetailPage key={record} recordId={record} /> : <RecordsPage kind="invoices" />)}
    </section>
    </Tabs>
    <details className="sf-card mt-8 p-5">
      <summary className="cursor-pointer font-semibold">Client Flow AI · ask about a company policy</summary>
      <div className="mt-5"><CompanyAI /></div>
    </details>
    <Modal open={creating} title="Create a service request" onClose={closeRequest}>
      {creating && <CreateRequest companyId={search.get('company') || ''} onCreated={created} onCancel={closeRequest} />}
    </Modal>
  </>
}

function CreateRequest({ companyId, onCreated, onCancel }: { companyId: string; onCreated: (id: string) => void; onCancel: () => void }) {
  const resource = useResource(() => clientService.companies())
  const [selected, setSelected] = useState(companyId)
  return <Resource {...resource} retry={resource.reload}>
    <div className="space-y-5">
      <SelectField label="Provider company" value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">Choose a company</option>
        {resource.data?.map(company => <option key={company.id} value={company.id}>{company.name} · {company.location}</option>)}
      </SelectField>
      {selected && <NewRequestPage key={selected} companyId={selected} onCreated={onCreated} onCancel={onCancel} />}
    </div>
  </Resource>
}

function CompanyAI() {
  const resource = useResource(() => clientService.companies())
  const [company, setCompany] = useState('')
  return <Resource {...resource} retry={resource.reload}>
    <div className="max-w-xl space-y-5">
      <SelectField label="Policy company" value={company} onChange={event => setCompany(event.target.value)}>
        <option value="">Choose a company</option>
        {resource.data?.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
      </SelectField>
      {company && <ClientFlowAI key={company} companyId={company} />}
    </div>
  </Resource>
}
