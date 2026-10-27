import { api, ApiError, demoMode } from './api'
import type { Company, Invoice, Job, PolicyAnswer, Quote, RequestInput, RequestRecord, Session } from '../types/client'

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
export const clientService = {
  async companies(): Promise<Company[]> { if (!demoMode) return api('/companies'); await wait(); return copy(companies) },
  async company(id: string): Promise<Company> { if (!demoMode) return api(`/companies/${encodeURIComponent(id)}`); await wait(); return copy(find(companies, id)) },
  async login(email: string, password: string): Promise<Session> {
    if (!demoMode) return api('/auth/login', 'POST', { email, password })
    await wait()
    if (email !== 'nimal@example.com' || password !== 'DemoClient123!') throw new ApiError('Use the sample account shown below to enter the demo.', 401)
    return { access_token: 'demo-only', user: { id: 'demo-client', name: 'Nimal Fernando', role: 'client' } }
  },
  async register(kind: string, body: Record<string, string>): Promise<Session | null> {
    if (!demoMode) { await api(`/auth/register/${kind}`, 'POST', body); return null }
    await wait()
    return { access_token: 'demo-only', user: { id: 'demo-client', name: body.name, role: kind === 'company' ? 'manager' : 'client', ...(kind === 'company' ? { company_status: 'PENDING' as const } : {}) } }
  },
  async changePassword(password: string) { if (!demoMode) return api('/auth/change-password', 'POST', { new_password: password }); await wait() },
  async requests(): Promise<RequestRecord[]> { if (!demoMode) return api('/requests'); await wait(); return copy(requests) },
  async request(id: string): Promise<RequestRecord> { if (!demoMode) return api(`/requests/${encodeURIComponent(id)}`); await wait(); return copy(find(requests, id)) },
  async createRequest(input: RequestInput): Promise<RequestRecord> {
    if (!demoMode) return api('/requests', 'POST', input)
    await wait(); const company = find(companies, input.company_id); const offer = find(company.offerings, input.company_service_id)
    const row: RequestRecord = { id: `SF-REQ-${Date.now()}`, client_id: 'demo-client', company_id: company.id, company_name: company.name, service: offer.name, description: input.description, address: input.address, preferred_date: input.preferred_date, status: 'NEW' }
    requests.unshift(row); return copy(row)
  },
  async cancelRequest(id: string, reason: string) {
    if (!demoMode) return api(`/requests/${encodeURIComponent(id)}/cancel`, 'POST', { reason })
    await wait(); const row = find(requests, id)
    if (!['NEW', 'QUOTED'].includes(row.status)) throw new ApiError('This request can no longer be cancelled. Refresh to see its current state.', 409)
    row.status = 'CANCELLED'; if (row.quotation_id) find(quotes, row.quotation_id).status = 'CANCELLED'
  },
  async quotes(): Promise<Quote[]> {
    if (!demoMode) { const records = await clientService.requests(); const ids = [...new Set(records.flatMap(r => r.quotation_id ? [r.quotation_id] : []))]; return Promise.all(ids.map(id => clientService.quote(id))) }
    await wait(); return copy(quotes)
  },
  async quote(id: string): Promise<Quote> { if (!demoMode) return api(`/quotations/${encodeURIComponent(id)}`); await wait(); return copy(find(quotes, id)) },
  async decideQuote(id: string, decision: 'approve' | 'decline') {
    if (!demoMode) return api(`/quotations/${encodeURIComponent(id)}/${decision}`, 'POST')
    await wait(); const row = find(quotes, id)
    if (row.status !== 'SENT') throw new ApiError('This quotation is no longer awaiting a decision.', 409)
    const request = find(requests, row.request_id)
    if (decision === 'approve') {
      row.status = 'APPROVED'; request.status = 'CONVERTED'
      jobs.unshift({ id: `SF-JOB-${Date.now()}`, request_id: request.id, company_name: row.company_name, service: row.service, status: 'JOB_CREATED', address: request.address })
    } else { row.status = 'DECLINED'; request.status = 'DECLINED' }
  },
  async jobs(): Promise<Job[]> { if (!demoMode) return api('/jobs'); await wait(); return copy(jobs) },
  async job(id: string): Promise<Job> { if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}`); await wait(); return copy(find(jobs, id)) },
  async decideSchedule(id: string, decision: 'approve' | 'decline') {
    if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}/schedule/${decision}`, 'POST')
    await wait(); const row = find(jobs, id)
    if (row.status !== 'SCHEDULE_PROPOSED') throw new ApiError('The appointment has changed. Refresh before deciding.', 409)
    row.status = decision === 'approve' ? 'SCHEDULE_CONFIRMED' : 'JOB_CREATED'
    if (decision === 'decline') delete row.appointment
  },
  async cancelJob(id: string, reason: string) {
    if (!demoMode) return api(`/jobs/${encodeURIComponent(id)}/cancel`, 'POST', { reason })
    await wait(); const row = find(jobs, id)
    if (!['JOB_CREATED', 'SCHEDULE_PROPOSED', 'SCHEDULE_CONFIRMED'].includes(row.status)) throw new ApiError('Cancellation is only available before work starts.', 409)
    row.status = 'CANCELLED'; delete row.appointment
  },
  async invoices(): Promise<Invoice[]> { if (!demoMode) return api('/invoices'); await wait(); return copy(invoices) },
  async invoice(id: string): Promise<Invoice> { if (!demoMode) return api(`/invoices/${encodeURIComponent(id)}`); await wait(); return copy(find(invoices, id)) },
  async policy(companyId: string): Promise<{ title: string; url: string } | null> { if (!demoMode) return api(`/companies/${encodeURIComponent(companyId)}/policy`); await wait(); return null },
  async ask(companyId: string, question: string): Promise<PolicyAnswer> {
    if (!demoMode) return api('/ai/ask-docs', 'POST', { company_id: companyId, question })
    await wait(); return { status: 'NO_POLICY', answer: 'No public policy is available for this sample company. Answers will appear when a company policy is connected.', citations: [] }
  }
}
