export type RequestState = "NEW" | "QUOTED" | "REJECTED" | "CANCELLED";

export interface ServiceRequest {
  id: string;
  clientName: string;
  serviceName: string;
  description: string;
  address: string;
  preferredDate: string;
  state: RequestState;
  rejectionReason?: string;
}

export const mockRequests: ServiceRequest[] = [
  {
    id: "r1",
    clientName: "Nimal Perera",
    serviceName: "Basic Inspection",
    description: "Inspect wiring in 3-bedroom house",
    address: "45 Galle Rd, Colombo 03",
    preferredDate: "2026-11-10",
    state: "NEW",
  },
  {
    id: "r2",
    clientName: "Kamala Silva",
    serviceName: "AC Service",
    description: "Two split AC units need cleaning",
    address: "12 Kandy Rd, Kadawatha",
    preferredDate: "2026-11-12",
    state: "NEW",
  },
  {
    id: "r3",
    clientName: "Ruwan Dias",
    serviceName: "Basic Inspection",
    description: "Post-renovation safety check",
    address: "8 Temple Rd, Nugegoda",
    preferredDate: "2026-11-08",
    state: "QUOTED",
  },
  {
  id: "r4",
  clientName: "Test Shared Client",
  serviceName: "Test Service",
  description: "This proves data is shared",
  address: "1 Test Lane",
  preferredDate: "2026-11-20",
  state: "NEW",
},
];

export type JobState =
  | "JOB_CREATED"
  | "SCHEDULE_PROPOSED"
  | "SCHEDULE_CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  hasActiveJobs: boolean;
}

export interface Job {
  id: string;
  requestId: string;
  serviceName: string;
  clientName: string;
  employeeId?: string;
  employeeName?: string;
  startTime?: string;
  endTime?: string;
  state: JobState;
}

export const mockEmployees: Employee[] = [
  { id: "e1", fullName: "Asha Fernando", email: "asha@brightfix.lk", isActive: true, hasActiveJobs: true },
  { id: "e2", fullName: "Ravi Perera", email: "ravi@brightfix.lk", isActive: true, hasActiveJobs: false },
  { id: "e3", fullName: "Maya Silva", email: "maya@brightfix.lk", isActive: false, hasActiveJobs: false },
  { id: "e1", fullName: "Asha Fernando", email: "asha@brightfix.lk", isActive: true, hasActiveJobs: true },
  { id: "e2", fullName: "Ravi Perera",   email: "ravi@brightfix.lk", isActive: true, hasActiveJobs: false },
  { id: "e3", fullName: "Maya Silva",    email: "maya@brightfix.lk", isActive: false, hasActiveJobs: false },
];

export const mockJobs: Job[] = [
  {
    id: "j1",
    requestId: "r3",
    serviceName: "Basic Inspection",
    clientName: "Ruwan Dias",
    state: "JOB_CREATED",
  },
  {
    id: "j2",
    requestId: "r2",
    serviceName: "AC Service",
    clientName: "Kamala Silva",
    employeeId: "e1",
    employeeName: "Asha Fernando",
    state: "JOB_CREATED",
  },
  {
    id: "j3",
    requestId: "r1",
    serviceName: "Basic Inspection",
    clientName: "Nimal Perera",
    employeeId: "e2",
    employeeName: "Ravi Perera",
    startTime: "2026-11-10T10:00:00",
    endTime: "2026-11-10T11:00:00",
    state: "SCHEDULE_PROPOSED",
  },{
  id: "j4",
  requestId: "r1",
  serviceName: "Basic Inspection",
  clientName: "Nimal Perera",
  employeeId: "e1",
  employeeName: "Asha Fernando",
  startTime: "2026-11-02T09:00:00",   
  endTime:   "2026-11-02T10:00:00",
  state: "SCHEDULE_CONFIRMED",
},
{
  id: "j5",
  requestId: "r5",
  serviceName: "AC Service",
  clientName: "Amal Perera",
  employeeId: "e1",
  employeeName: "Asha Fernando",
  startTime: "2026-12-25T14:00:00",   
  endTime:   "2026-12-25T15:00:00",
  state: "SCHEDULE_CONFIRMED",
},

{
  id: "j6",
  requestId: "r6",
  serviceName: "Basic Inspection",
  clientName: "Sanjay Perera",
  employeeId: "e1",
  employeeName: "Asha Fernando",
  startTime: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
  endTime: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
  state: "SCHEDULE_CONFIRMED",
},

];

// 1-hour slots, weekdays, 09:00-17:00 (last start 16:00)
export const mockAvailableSlots = [
  "2026-11-10T09:00:00",
  "2026-11-10T14:00:00",
  "2026-11-11T10:00:00",
  "2026-11-12T15:00:00",
];

export type InvoiceState = "UNPAID" | "PAID";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId: string;
  clientName: string;
  serviceName: string;
  total: number;
  state: InvoiceState;
  paymentMethod?: string;
  paidAt?: string;
}

export const mockInvoices: Invoice[] = [
  {
    id: "i1",
    invoiceNumber: "INV-2026-001",
    jobId: "j1",
    clientName: "Ruwan Dias",
    serviceName: "Basic Inspection",
    total: 3000.0,
    state: "UNPAID",
  },
  {
    id: "i2",
    invoiceNumber: "INV-2026-002",
    jobId: "j2",
    clientName: "Kamala Silva",
    serviceName: "AC Service",
    total: 4500.0,
    state: "UNPAID",
  },
  {
    id: "i3",
    invoiceNumber: "INV-2026-003",
    jobId: "j0",
    clientName: "Amal Perera",
    serviceName: "Basic Inspection",
    total: 3000.0,
    state: "PAID",
    paymentMethod: "Cash",
    paidAt: "2026-11-01T14:30:00",
  },
];

export type CompanyState = "PENDING" | "APPROVED" | "REJECTED";

export interface Company {
  id: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  location: string;
  registeredAt: string;
  state: CompanyState;
  rejectionReason?: string;
}

export const mockCompanies: Company[] = [
  {
    id: "c1",
    name: "BrightFix",
    description: "Home repairs and maintenance",
    email: "hello@brightfix.lk",
    phone: "+94 11 555 0100",
    location: "Colombo 03",
    registeredAt: "2026-10-28",
    state: "PENDING",
  },
  {
    id: "c2",
    name: "CoolAir LK",
    description: "AC installation and servicing",
    email: "hi@coolair.lk",
    phone: "+94 11 555 0200",
    location: "Kadawatha",
    registeredAt: "2026-10-30",
    state: "PENDING",
  },
  {
    id: "c3",
    name: "CleanPro",
    description: "Deep cleaning services",
    email: "hello@cleanpro.lk",
    phone: "+94 11 555 0300",
    location: "Nugegoda",
    registeredAt: "2026-10-25",
    state: "APPROVED",
  },
  {
    id: "c4",
    name: "FixItFast",
    description: "Plumbing and electrical",
    email: "team@fixitfast.lk",
    phone: "+94 11 555 0400",
    location: "Dehiwala",
    registeredAt: "2026-10-15",
    state: "REJECTED",
    rejectionReason: "Missing business registration documents",
  },
];

// helper for the dashboard
export const dashboardStats = () => {
  return {
    newRequests: mockRequests.filter(r => r.state === "NEW").length,
    jobsInProgress: mockJobs.filter(j => j.state === "IN_PROGRESS" || j.state === "SCHEDULE_CONFIRMED").length,
    unpaidInvoices: mockInvoices.filter(i => i.state === "UNPAID").length,
    unpaidTotal: mockInvoices
      .filter(i => i.state === "UNPAID")
      .reduce((s, i) => s + i.total, 0),
  };
};

export type PolicyState = "NONE" | "PROCESSING" | "READY" | "FAILED";

export interface PolicyStatus {
  state: PolicyState;
  activeVersion?: number;
  filename?: string;
  uploadedAt?: string;
  message?: string;
}

export const mockPolicyStatus: PolicyStatus = {
  state: "READY",
  activeVersion: 1,
  filename: "brightfix-policy-v1.pdf",
  uploadedAt: "2026-10-28",
};

export interface AiAnswer {
  status: "OK" | "NO_POLICY" | "INSUFFICIENT_EVIDENCE" | "UNAVAILABLE";
  answer?: string;
  source?: string;
  page?: number;
}


// mock servisec
export interface Service {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export const mockServices: Service[] = [
  { id: "s1", name: "Basic Inspection", description: "1-hour property inspection", isActive: true },
  { id: "s2", name: "AC Service",       description: "Split AC cleaning and gas top-up", isActive: true },
  { id: "s3", name: "Deep Cleaning",    description: "Full house deep clean", isActive: true },
  { id: "s4", name: "Plumbing Repair",  description: "Pipe and tap repairs", isActive: false },
];