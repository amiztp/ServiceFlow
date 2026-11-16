import { api, apiUpload, apiBlob } from './api'
import type {
  CatalogService, PolicyRow, Provider, ProviderOffering,
  ServiceArea, WorkingHour,
  RequestRow, RequestMessage, QuotationItem, QuotationRow,
  InvoiceRow, PaymentRow,
  JobRow, JobDetailRow, EmployeeRow, 
  EmployeeCreateResponse, EmployeeUpdateInput,
  AdminProviderRow, ProviderActionResponse,
  DisputeRow,NotificationRow, NotificationList,RequestAttachmentRow,
} from '../types/provider'

export const providerService = {
  // ---- Provider profile ----
  getProfile: () => api<Provider>('/providers/me'),
  updateProfile: (body: Partial<Provider>) => api<Provider>('/providers/me', 'PATCH', body),

  // ---- Offerings ----
  listCatalogServices: () => api<CatalogService[]>('/services'),
  listMyOfferings: () => api<ProviderOffering[]>('/provider/me/services'),
  createOffering: (body: { service_id: number; starting_price: number; description?: string }) =>
    api<ProviderOffering>('/provider/me/services', 'POST', body),
  updateOffering: (id: number, body: { starting_price?: number; description?: string; is_active?: boolean }) =>
    api<ProviderOffering>(`/provider/me/services/${id}`, 'PATCH', body),

  // ---- Service areas ----
  listServiceAreas: async (): Promise<ServiceArea[]> => {
    const r = await api<{ service_areas: ServiceArea[] }>('/providers/me/service-areas')
    return r.service_areas
  },
  createServiceArea: (area_name: string) =>
    api<ServiceArea>('/providers/me/service-areas', 'POST', { area_name }),
  deleteServiceArea: (id: number) =>
    api<void>(`/providers/me/service-areas/${id}`, 'DELETE'),

  // ---- Working hours ----
  getWorkingHours: async (): Promise<WorkingHour[]> => {
    const r = await api<{ working_hours: WorkingHour[] }>('/providers/me/working-hours')
    return r.working_hours
  },
  saveWorkingHours: async (hours: WorkingHour[]): Promise<WorkingHour[]> => {
    const r = await api<{ working_hours: WorkingHour[] }>(
      '/providers/me/working-hours', 'PUT', { working_hours: hours },
    )
    return r.working_hours
  },

  // ---- Policies ----
  uploadPolicy: (form: FormData) => apiUpload('/policies/upload', form),
  listMyPolicies: () => api<PolicyRow[]>('/policies/me'),
  deletePolicy: (id: number) => api<void>(`/policies/${id}`, 'DELETE'),
  activatePolicy: (id: number) => api<PolicyRow>(`/policies/${id}/activate`, 'PATCH'),

  // ---- Requests ----
  listIncomingRequests: (status?: string) =>
    api<{ items: RequestRow[]; total: number; limit: number; offset: number }>(
      `/requests${status ? `?status=${status}` : ''}`,
    ),
  getRequest: (id: number) => api<RequestRow>(`/requests/${id}`),
  reviewRequest: (id: number) => api(`/requests/${id}/review`, 'POST'),
  requestInformation: (id: number, message_text: string) =>
    api(`/requests/${id}/request-information`, 'POST', { message_text }),
  rejectRequest: (id: number, reason: string) =>
    api(`/requests/${id}/reject`, 'POST', { reason }),

  // ---- Messages ----
  listMessages: async (id: number): Promise<RequestMessage[]> => {
    const r = await api<{ items: RequestMessage[]; total: number }>(`/requests/${id}/messages`)
    return r.items
  },
  sendMessage: (id: number, message_text: string) =>
    api<RequestMessage>(`/requests/${id}/messages`, 'POST', { message_text }),

  // ---- Quotations ----
  listQuotations: (requestId: number) =>
    api<QuotationRow[]>(`/requests/${requestId}/quotations`),
  createQuotation: (requestId: number, body: {
    items: QuotationItem[]
    valid_until: string
    downpayment_amount?: number
    note?: string
  }) => api<QuotationRow>(`/requests/${requestId}/quotations`, 'POST', body),
  updateQuotation: (id: number, body: {
    items?: QuotationItem[]
    valid_until?: string
    downpayment_amount?: number | null
    note?: string | null
  }) => api<QuotationRow>(`/quotations/${id}`, 'PATCH', body),
  sendQuotation: (quotationId: number) =>
    api<QuotationRow>(`/quotations/${quotationId}`, 'PATCH', { status: 'SENT' }),

  // ---- Jobs ----
  listJobs: (params?: { status?: string; schedule_status?: string }) => {
    const sp = new URLSearchParams()
    if (params?.status) sp.set('status', params.status)
    if (params?.schedule_status) sp.set('schedule_status', params.schedule_status)
    const qs = sp.toString() ? `?${sp.toString()}` : ''
    return api<{ items: JobRow[]; total: number; limit: number; offset: number }>(`/jobs${qs}`)
  },
  getJob: (id: number) => api<JobDetailRow>(`/jobs/${id}`),
  assignEmployee: (jobId: number, employeeId: number) =>
    api<JobRow>(`/jobs/${jobId}/assign`, 'POST', { employee_id: employeeId }),
    proposeSchedule: (jobId: number, schedule_date: string, schedule_time: string) =>
    api<JobRow>(`/jobs/${jobId}/schedule`, 'POST', { schedule_date, schedule_time }),
    cancelJob: (jobId: number, reason: string) =>
    api<JobRow>(`/jobs/${jobId}/cancel`, 'POST', { reason }),
  // ---- Employees ----
  listEmployees: () => api<EmployeeRow[]>('/company/employees'),

  createEmployee: (body: { name: string; email: string; phone: string }) =>
  api<EmployeeCreateResponse>('/company/employees', 'POST', body),
  updateEmployee: (id: number, body: EmployeeUpdateInput) =>
  api<EmployeeRow>(`/company/employees/${id}`, 'PATCH', body),

  // ---- Invoices ----
  listInvoices: () =>
    api<{ items: InvoiceRow[]; total: number; limit: number; offset: number }>('/invoices'),
  getInvoice: (id: number) => api<InvoiceRow>(`/invoices/${id}`),
  listPayments: async (invoiceId: number): Promise<PaymentRow[]> => {
    const r = await api<{ items: PaymentRow[]; total: number }>(`/invoices/${invoiceId}/payments`)
    return r.items
  },
  recordPayment: (invoiceId: number, body: {
    amount: number
    method: 'CASH' | 'BANK_TRANSFER' | 'CARD_EXTERNAL' | 'OTHER'
    reference?: string
    note?: string
  }) => api<PaymentRow>(`/invoices/${invoiceId}/payments`, 'POST', body),
  downloadInvoicePdf: async (id: number) => {
    const blob = await apiBlob(`/invoices/${id}/pdf`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${id}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

    // ---- Admin: provider verification ----
  adminListProviders: (params?: { verification_status?: string; provider_type?: string }) => {
    const sp = new URLSearchParams()
    if (params?.verification_status) sp.set('verification_status', params.verification_status)
    if (params?.provider_type) sp.set('provider_type', params.provider_type)
    const qs = sp.toString() ? `?${sp.toString()}` : ''
    return api<{ items: AdminProviderRow[]; total: number; limit: number; offset: number }>(`/admin/providers${qs}`)
  },
  adminGetProvider: (id: number) => api<AdminProviderRow>(`/admin/providers/${id}`),
  adminApproveProvider: (id: number) => api<ProviderActionResponse>(`/admin/providers/${id}/approve`, 'PATCH'),
  adminRejectProvider: (id: number) => api<ProviderActionResponse>(`/admin/providers/${id}/reject`, 'PATCH'),
  adminSuspendProvider: (id: number) => api<ProviderActionResponse>(`/admin/providers/${id}/suspend`, 'PATCH'),


    // ---- Admin: service catalog ----
  adminListServices: () => api<CatalogService[]>('/admin/services'),
  adminCreateService: (body: { name: string; description?: string; category: string }) =>
    api<CatalogService>('/admin/services', 'POST', body),
  adminUpdateService: (id: number, body: { name?: string; description?: string; category?: string; is_active?: boolean }) =>
    api<CatalogService>(`/admin/services/${id}`, 'PATCH', body),
  adminDeactivateService: (id: number) =>
    api<CatalogService>(`/admin/services/${id}/deactivate`, 'POST'),



    // ---- Admin: disputes ----
  adminListDisputes: () =>
    api<DisputeRow[]>('/admin/disputes'),
  adminUpdateDispute: (id: number, body: { status: DisputeRow['status']; admin_note?: string | null }) =>
    api<DisputeRow>(`/admin/disputes/${id}`, 'PATCH', body),

    // ---- Notifications ----
  listNotifications: (params?: { page?: number; limit?: number; unread_only?: boolean }) => {
    const sp = new URLSearchParams()
    if (params?.page) sp.set('page', String(params.page))
    if (params?.limit) sp.set('limit', String(params.limit))
    if (params?.unread_only) sp.set('unread_only', 'true')
    const qs = sp.toString() ? `?${sp.toString()}` : ''
    return api<NotificationList>(`/notifications${qs}`)
  },
  unreadNotificationCount: () =>
    api<{ unread_count: number }>('/notifications/unread-count'),
  markNotificationRead: (id: number) =>
    api<NotificationRow>(`/notifications/${id}/read`, 'PATCH'),
  markAllNotificationsRead: () =>
    api<{ updated_count: number; message: string }>('/notifications/read-all', 'PATCH'),
  


    listRequestAttachments: (requestId: number) =>
    api<RequestAttachmentRow[]>(`/requests/${requestId}/attachments`),
  uploadRequestAttachment: (requestId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiUpload<RequestAttachmentRow>(`/requests/${requestId}/attachments`, form)
  },
  downloadRequestAttachment: async (requestId: number, attachmentId: number, fileName: string) => {
    const blob = await apiBlob(`/requests/${requestId}/attachments/${attachmentId}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },



    // ---- Disputes (provider side) ----
  listMyDisputes: () => api<DisputeRow[]>('/disputes/mine'),
  createJobDispute: (jobId: number, body: { reason: string; description: string }) =>
    api<DisputeRow>(`/jobs/${jobId}/disputes`, 'POST', body),



    downloadPolicy: async (id: number, title: string) => {
    const blob = await apiBlob(`/policies/${id}/download`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^\w\s-]/g, '')}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

}