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
];