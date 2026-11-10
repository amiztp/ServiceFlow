import { demoAccount, requireDemo } from './demo-account'
import { api, ApiError, demoMode, liveApiMode, setAccessToken } from './api'
import type { Company, Invoice, Job, PolicyAnswer, Quote, RequestInput, RequestRecord, Session, User, Role } from '../types/client'

type BackendUser = Omit<User, 'id' | 'role'> & { id: string | number; role: string }
type ApiProviderSummary = { id: number; name: string; description?: string | null; accepting_requests?: boolean; rating?: number | null; completed_jobs?: number | null; starting_price?: number | null }
type ApiProviderDetail = ApiProviderSummary & { type?: string; email?: string | null; phone?: string | null; address?: string | null; areas?: unknown[]; services?: { id: number; service_id: number; service_name: string; description?: string | null; starting_price: number }[] }
type ApiService = { id: number; name: string; category?: string | null }
type ApiRequest = { id: number; client_id: number; provider_id: number; service_id: number; description: string; preferred_date: string; preferred_time?: string | null; address: string; latitude?: number | null; longitude?: number | null; status: string }
type ApiRequestList = { items: ApiRequest[]; total: number; limit: number; offset: number }
function normalizeUser(value: BackendUser): User {
  const roles: Record<string, Role> = { CLIENT: 'client', COMPANY_MANAGER: 'manager', EMPLOYEE: 'employee', SYSTEM_ADMIN: 'admin', client: 'client', manager: 'manager', employee: 'employee', admin: 'admin' }
  const role = roles[value.role]
  if (!role) throw new ApiError('This account role is not supported by the current release.', 403)
  return { ...value, id: String(value.id), role }
}

function providerSummary(value: ApiProviderSummary): Company {
  return {
    id: String(value.id), name: value.name, category: 'Service provider', location: 'Service area available on profile',
    description: value.description || 'This provider has not added a public description yet.', phone: '', email: '',
    offerings: [], completed_jobs: value.completed_jobs ?? 0,
  }
}

function providerDetail(value: ApiProviderDetail): Company {
  const areas = (value.areas || []).map(area => typeof area === 'string' ? area : '').filter(Boolean)
  return {
    ...providerSummary(value), location: value.address || areas.join(', ') || 'Service area available on request',
    phone: value.phone || '', email: value.email || '',
    focus_areas: areas,
    offerings: (value.services || []).map(service => ({
      id: String(service.service_id), name: service.service_name, starting_price: Number(service.starting_price), active: true,
    })),
  }
}

function requestRecord(value: ApiRequest, providers: Map<number, ApiProviderSummary>, services: Map<number, ApiService>): RequestRecord {
  const provider = providers.get(value.provider_id)
  const service = services.get(value.service_id)
  return {
    id: String(value.id), client_id: String(value.client_id), company_id: String(value.provider_id),
    company_name: provider?.name || 'Service provider', service: service?.name || 'Requested service',
    description: value.description, address: value.address, preferred_date: value.preferred_date,
    preferred_time: value.preferred_time || undefined, latitude: value.latitude ?? undefined, longitude: value.longitude ?? undefined,
    status: value.status as RequestRecord['status'],
  }
}

async function requestReferences() {
  const [providers, services] = await Promise.all([
    api<ApiProviderSummary[]>('/providers?provider_type=COMPANY&limit=100'),
    api<ApiService[]>('/services'),
  ])
  return { providers: new Map(providers.map(provider => [provider.id, provider])), services: new Map(services.map(service => [service.id, service])) }
}

const companies: Company[] = [
  { id: 'brightfix', name: 'BrightFix', category: 'Electrical & maintenance', location: 'Colombo', description: 'Practical help for the spaces you depend on. Book electrical inspections and everyday maintenance with our company team.', phone: '+94 11 234 5678', email: 'hello@example.com', offerings: [{ id: 'inspection', name: 'Basic inspection', starting_price: 3000, active: true }, { id: 'electrical', name: 'Electrical maintenance', starting_price: 4500, active: true }] },
  { id: 'clearwater', name: 'ClearWater Services', category: 'Plumbing', location: 'Nugegoda', description: 'Plumbing inspections, leak assessment and household maintenance.', phone: '+94 11 234 5679', email: 'water@example.com', offerings: [{ id: 'plumbing', name: 'Plumbing inspection', starting_price: 2500, active: true }] },
  { id: 'coolworks', name: 'CoolWorks', category: 'Air conditioning', location: 'Dehiwala', description: 'Air conditioning servicing and cooling system inspections for your home.', phone: '+94 11 234 5680', email: 'cool@example.com', offerings: [{ id: 'ac', name: 'AC servicing', starting_price: 5000, active: true }] }
]
const nextSlot = () => {
  const date = new Date(); date.setUTCDate(date.getUTCDate() + 2)
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1)
  return `${date.toISOString().slice(0, 10)}T10:00:00+05:30`
}
const sampleItems = [{ description: 'Inspection service', quantity: 1, unit_price: 2500 }, { description: 'Call-out', quantity: 1, unit_price: 500 }]
const requests: RequestRecord[] = [
  { id: 'SF-REQ-1001', client_id: 'demo-client', company_id: 'brightfix', company_name: 'BrightFix', service: 'Basic inspection', description: 'Please inspect an intermittent power issue in the kitchen.', address: '24 Lake Road, Colombo', preferred_date: nextSlot().slice(0, 10), status: 'QUOTED', quotation_id: 'SF-QUO-1001' },
  { id: 'SF-REQ-1002', client_id: 'demo-client', company_id: 'brightfix', company_name: 'BrightFix', service: 'Basic inspection', description: 'Check the living room electrical outlets.', address: '24 Lake Road, Colombo', preferred_date: nextSlot().slice(0, 10), status: 'CONVERTED', quotation_id: 'SF-QUO-1002' },
  { id: 'SF-REQ-1003', client_id: 'demo-client', company_id: 'brightfix', company_name: 'BrightFix', service: 'Basic inspection', description: 'Completed sample inspection.', address: '24 Lake Road, Colombo', preferred_date: '2026-10-20', status: 'CONVERTED', quotation_id: 'SF-QUO-1003' }
]
const quotes: Quote[] = requests.map((r, i) => ({ id: r.quotation_id!, request_id: r.id, company_name: r.company_name, service: r.service, status: i ? 'APPROVED' : 'SENT', items: sampleItems.map(item => ({ ...item })), total: 3000 }))
const jobs: Job[] = [
  { id: 'SF-JOB-1002', request_id: requests[1].id, company_name: 'BrightFix', service: 'Basic inspection', status: 'SCHEDULE_PROPOSED', appointment: nextSlot(), address: requests[1].address },
  { id: 'SF-JOB-1003', request_id: requests[2].id, company_name: 'BrightFix', service: 'Basic inspection', status: 'COMPLETED', appointment: '2026-10-20T10:00:00+05:30', address: requests[2].address }
]
const invoices: Invoice[] = [{ id: 'SF-INV-1003', job_id: 'SF-JOB-1003', company_name: 'BrightFix', service: 'Basic inspection', total: 3000, status: 'PAID', items: sampleItems }]
const wait = () => new Promise(resolve => setTimeout(resolve, 250))
function find<T extends { id: string }>(rows: T[], id: string): T {
  const row = rows.find(value => value.id === id)
  if (!row) throw new ApiError('This record is unavailable or you do not have access to it.', 404)
  return row
}
const copy = <T,>(value: T): T => structuredClone(value)
function publicCompany(company: Company): Company {
  const companyRequests = requests.filter(request => request.company_id === company.id)
  return {
    ...company,
    focus_areas: company.offerings.filter(offering => offering.active).map(offering => offering.name),
    completed_jobs: jobs.filter(job => job.status === 'COMPLETED' && companyRequests.some(request => request.id === job.request_id)).length,
  }
}
export const clientService = {
  async companies(): Promise<Company[]> {
    if (liveApiMode) {
      const records = await api<ApiProviderSummary[]>('/providers?provider_type=COMPANY&limit=100')
      return records.map(providerSummary)
    }
    if (!demoMode) return api('/companies')
    await wait(); return copy(companies.map(publicCompany))
  },
  async company(id: string): Promise<Company> {
    if (liveApiMode) return providerDetail(await api<ApiProviderDetail>(`/providers/${encodeURIComponent(id)}`))
    if (!demoMode) return api(`/companies/${encodeURIComponent(id)}`)
    await wait(); return copy(publicCompany(find(companies, id)))
  },
  async login(email: string, password: string): Promise<Session> {
    if (liveApiMode || !demoMode) {
      const result = await api<{ access_token: string; user?: BackendUser }>('/auth/login', 'POST', { email, password })
      setAccessToken(result.access_token)
      try { return { access_token: result.access_token, user: result.user ? normalizeUser(result.user) : await clientService.me() } }
      catch (cause) { setAccessToken(null); throw cause }
    }
    await wait()
    return demoAccount.login(email, password)
  },
  async register(kind: string, body: Record<string, string>): Promise<Session | null> {
    if (liveApiMode) {
      const payload = kind === 'client' ? body : {
        provider_name: body.company_name, provider_email: body.email, provider_phone: body.phone,
        name: body.name, email: body.email, phone: body.phone, password: body.password,
      }
      await api(kind === 'client' ? '/auth/register' : '/auth/register/company', 'POST', payload)
      return null
    }
    if (!demoMode) { if (kind !== 'client') requireDemo('Company registration'); await api(kind === 'client' ? '/auth/register' : '/auth/register/company', 'POST', body); return null }
    await wait()
    return demoAccount.register(kind, body)
  },
  async changePassword(password: string, currentPassword?: string) {
    if (liveApiMode) {
      if (!currentPassword) throw new ApiError('Enter your current password before choosing a new password.', 422)
      return api('/auth/change-password', 'POST', { current_password: currentPassword, new_password: password })
    }
    if (!demoMode) return api('/auth/change-password', 'POST', { new_password: password }); await wait(); demoAccount.changePassword(password)
  },
  async me(): Promise<User> { return liveApiMode || !demoMode ? normalizeUser(await api<BackendUser>('/auth/me')) : demoAccount.me() },
  async requests(): Promise<RequestRecord[]> {
    if (liveApiMode) {
      const [records, references] = await Promise.all([api<ApiRequestList>('/requests?limit=100'), requestReferences()])
      return records.items.map(record => requestRecord(record, references.providers, references.services))
    }
    if (!demoMode) return api('/requests'); await wait(); return copy(requests.filter(row => row.client_id === demoAccount.id()))
  },
  async request(id: string): Promise<RequestRecord> {
    if (liveApiMode) {
      const [record, references] = await Promise.all([api<ApiRequest>(`/requests/${encodeURIComponent(id)}`), requestReferences()])
      return requestRecord(record, references.providers, references.services)
    }
    if (!demoMode) return api(`/requests/${encodeURIComponent(id)}`); await wait(); return copy(find(requests.filter(row => row.client_id === demoAccount.id()), id))
  },
  async createRequest(input: RequestInput): Promise<RequestRecord> {
    if (liveApiMode) {
      if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) throw new ApiError('Choose or enter the service location before sending this request.', 422)
      const saved = await api<ApiRequest>('/requests', 'POST', {
        provider_id: Number(input.company_id), service_id: Number(input.company_service_id), description: input.description,
        preferred_date: input.preferred_date, preferred_time: input.preferred_time || null, address: input.address,
        latitude: input.latitude, longitude: input.longitude,
      })
      const references = await requestReferences()
      return requestRecord(saved, references.providers, references.services)
    }
    if (!demoMode) return api('/requests', 'POST', input)
    await wait(); const company = find(companies, input.company_id); const offer = find(company.offerings, input.company_service_id)
    const row: RequestRecord = { id: `SF-REQ-${Date.now()}`, client_id: demoAccount.me().id, company_id: company.id, company_name: company.name, service: offer.name, description: input.description, address: input.address, preferred_date: input.preferred_date, preferred_time: input.preferred_time, latitude: input.latitude, longitude: input.longitude, photos: input.photos, status: 'NEW' }
    requests.unshift(row); return copy(row)
  },
  async cancelRequest(id: string, reason: string) {
    if (liveApiMode || !demoMode) return api(`/requests/${encodeURIComponent(id)}/cancel`, 'POST', { reason })
    await wait(); const row = find(requests.filter(row => row.client_id === demoAccount.id()), id)
    if (!['NEW', 'QUOTED'].includes(row.status)) throw new ApiError('This request can no longer be cancelled. Refresh to see its current state.', 409)
    row.status = 'CANCELLED'; if (row.quotation_id) find(quotes, row.quotation_id).status = 'CANCELLED'
  },
  async quotes(): Promise<Quote[]> {
    if (!demoMode) { const records = await clientService.requests(); const ids = [...new Set(records.flatMap(r => r.quotation_id ? [r.quotation_id] : []))]; return Promise.all(ids.map(id => clientService.quote(id))) }
    await wait(); return copy(quotes.filter(row => requests.some(request => request.id === row.request_id && request.client_id === demoAccount.id())))
  },
  async quote(id: string): Promise<Quote> { if (!demoMode) return api(`/quotations/${encodeURIComponent(id)}`); await wait(); return copy(find(await clientService.quotes(), id)) },
  async decideQuote(id: string, decision: 'approve' | 'decline') {
    if (!demoMode) return api(`/quotations/${encodeURIComponent(id)}/${decision}`, 'POST')
    await wait(); const row = find(quotes, (await clientService.quote(id)).id)
    if (row.status !== 'SENT') throw new ApiError('This quotation is no longer awaiting a decision.', 409)
    const request = find(requests, row.request_id)
    if (decision === 'approve') {
      row.status = 'APPROVED'; request.status = 'CONVERTED'
      jobs.unshift({ id: `SF-JOB-${Date.now()}`, request_id: request.id, company_name: row.company_name, service: row.service, status: 'JOB_CREATED', address: request.address })
    } else { row.status = 'DECLINED'; request.status = 'DECLINED' }
  },
  async jobs(): Promise<Job[]> { if (!demoMode) return api('/jobs'); await wait(); return copy(jobs.filter(row => requests.some(request => request.id === row.request_id && request.client_id === demoAccount.id()))) },
  async job(id: string): Promise<Job> { if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}`); await wait(); return copy(find(await clientService.jobs(), id)) },
  async decideSchedule(id: string, decision: 'approve' | 'decline') {
    if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}/schedule/${decision}`, 'POST')
    await wait(); const row = find(jobs, (await clientService.job(id)).id)
    if (row.status !== 'SCHEDULE_PROPOSED') throw new ApiError('The appointment has changed. Refresh before deciding.', 409)
    row.status = decision === 'approve' ? 'SCHEDULE_CONFIRMED' : 'JOB_CREATED'
    if (decision === 'decline') delete row.appointment
  },
  async cancelJob(id: string, reason: string) {
    if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}/cancel`, 'POST', { reason })
    await wait(); const row = find(jobs, (await clientService.job(id)).id)
    if (!['JOB_CREATED', 'SCHEDULE_PROPOSED', 'SCHEDULE_CONFIRMED'].includes(row.status)) throw new ApiError('Cancellation is only available before work starts.', 409)
    row.status = 'CANCELLED'; delete row.appointment
  },
  async invoices(): Promise<Invoice[]> { if (!demoMode) return api('/invoices'); await wait(); const ownedJobs = await clientService.jobs(); return copy(invoices.filter(row => ownedJobs.some(job => job.id === row.job_id))) },
  async invoice(id: string): Promise<Invoice> { if (!demoMode) return api(`/invoices/${encodeURIComponent(id)}`); await wait(); return copy(find(await clientService.invoices(), id)) },
  async policy(companyId: string): Promise<{ title: string; url: string } | null> { if (!demoMode) return api(`/companies/${encodeURIComponent(companyId)}/policy`); await wait(); return null },
  async ask(companyId: string, question: string): Promise<PolicyAnswer> {
    if (!demoMode) return api('/ai/ask-docs', 'POST', { company_id: companyId, question })
    await wait(); return { status: 'NO_POLICY', answer: 'No public policy is available for this sample company. Answers will appear when a company policy is connected.', citations: [] }
  }
}
