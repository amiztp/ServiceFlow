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
  },
];

// 1-hour slots, weekdays, 09:00-17:00 (last start 16:00)
export const mockAvailableSlots = [
  "2026-11-10T09:00:00",
  "2026-11-10T14:00:00",
  "2026-11-11T10:00:00",
  "2026-11-12T15:00:00",
];