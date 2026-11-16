export type Provider = {
  id: number
  type: string
  name: string
  description?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  verification_status?: string
  accepting_requests?: boolean
}

export type CatalogService = {
  id: number
  name: string
  description?: string | null
  category?: string | null
  is_active: boolean
}

export type ProviderOffering = {
  id: number
  service_id: number
  service_name: string
  description?: string | null
  starting_price: string
  is_active: boolean
  catalog_is_active: boolean
}

export type ServiceArea = { id: number; provider_id: number; area_name: string }

export type WorkingHour = {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_closed: boolean
}

export type PolicyRow = {
  id: number
  policy_type: 'SERVICE' | 'WARRANTY' | 'CANCELLATION' | 'PAYMENT' | 'TERMS_AND_CONDITIONS'
  title: string
  visibility: 'PUBLIC' | 'PRIVATE'
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
}

export type RequestRow = {
  id: number
  client_id: number
  provider_id: number
  service_id: number
  description: string
  preferred_date: string
  preferred_time?: string | null
  address: string
  latitude: number
  longitude: number
  status: 'NEW' | 'UNDER_REVIEW' | 'NEED_INFORMATION' | 'QUOTATION_SENT' | 'REJECTED' | 'CANCELLED'
  rejection_reason?: string | null
  cancellation_reason?: string | null
  created_at: string
  updated_at: string
}

export type RequestMessage = {
  id: number
  request_id: number
  sender_user_id: number
  message_text: string
  created_at: string
}

export type QuotationItem = { description: string; quantity: number; unit_price: number }

export type QuotationRow = {
  id: number
  request_id: number
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'EXPIRED'
  subtotal: string
  total_amount: string
  valid_until: string
  downpayment_amount?: string | null
  note?: string | null
  created_at: string
  updated_at: string
  items: {
    id: number
    quotation_id: number
    description: string
    quantity: string
    unit_price: string
    line_total: string
  }[]
  job_id?: number | null
}

export type InvoiceRow = {
  id: number
  job_id: number
  invoice_number: string
  total_amount: string
  downpayment_amount: string
  paid_amount: string
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | string
  issued_at: string
  paid_at: string | null
}

export type PaymentRow = {
  id: number
  invoice_id: number
  received_by: number
  amount: string
  method: 'CASH' | 'BANK_TRANSFER' | 'CARD_EXTERNAL' | 'OTHER'
  reference: string | null
  note: string | null
  received_at: string
}

export type JobRow = {
  id: number
  request_id: number
  quotation_id: number
  provider_id: number
  assigned_user_id: number | null
  schedule_date: string | null
  schedule_time: string | null
  schedule_status: 'NOT_PROPOSED' | 'PENDING' | 'CONFIRMED'
  status: 'JOB_CREATED' | 'SCHEDULE_PROPOSED' | 'SCHEDULE_CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  cancellation_reason?: string | null
  cancelled_at?: string | null
  cancelled_by?: number | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export type JobDetailRow = JobRow & {
  records: {
    id: number
    job_id: number
    record_type: string
    note: string | null
    material_name: string | null
    quantity: string | null
    unit: string | null
    file_name: string | null
    content_type: string | null
    created_at: string
  }[]
}

export type EmployeeRow = {
  id: number
  provider_id: number
  name: string
  email: string
  phone: string
  role: string
  status: string
  must_change_password: boolean
}

export type EmployeeCreateResponse = EmployeeRow & { initial_password: string }

export type EmployeeUpdateInput = {
  email?: string | null
  status?: 'ACTIVE' | 'INACTIVE' | null
}


export type SkillRow = { id: number; user_id: number; skill_name: string }

export type JobRecordRow = {
  id: number
  job_id: number
  record_type: string
  note: string | null
  material_name: string | null
  quantity: string | null
  unit: string | null
  file_name: string | null
  content_type: string | null
  created_at: string
}

export type AdminProviderRow = {
  id: number
  type: 'INDIVIDUAL' | 'COMPANY' | string
  name: string
  description: string | null
  email: string
  phone: string
  address: string | null
  verification_status: string
  accepting_requests: boolean
  created_at: string
  updated_at: string
}

export type ProviderActionResponse = { message: string; provider: AdminProviderRow }


export type DisputeRow = {
  id: number
  job_id: number
  opened_by: number
  reason: string
  description: string
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'
  admin_note: string | null
  created_at: string
  closed_at: string | null
}

export type NotificationRow = {
  id: number
  user_id: number | string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export type NotificationList = {
  items: NotificationRow[]
  page: number
  limit: number
  total: number
  total_pages: number
}

export type RequestAttachmentRow = {
  id: number
  request_id: number
  file_name: string
  content_type: string
  created_at: string
}