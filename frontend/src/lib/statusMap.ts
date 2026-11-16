import type { WorkflowStatus } from "../components";

export type RequestState = "NEW" | "QUOTED" | "CONVERTED" | "REJECTED" | "CANCELLED" | "DECLINED";
export type QuotationState = "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "CANCELLED";
export type JobState = "JOB_CREATED" | "SCHEDULE_PROPOSED" | "SCHEDULE_CONFIRMED" | "IN_PROGRESS" | "COMPLETED";
export type InvoiceState = "UNPAID" | "PAID";
export type CompanyState = "PENDING" | "APPROVED" | "REJECTED";

export const requestStatus = (s: RequestState): WorkflowStatus =>
  s === "NEW" ? "awaiting" :
  s === "QUOTED" ? "awaiting" :
  s === "CONVERTED" ? "approved" :
  s === "REJECTED" ? "declined" :
  s === "DECLINED" ? "declined" : "cancelled";

export const quotationStatus = (s: QuotationState): WorkflowStatus =>
  s === "APPROVED" ? "approved" :
  s === "DECLINED" ? "declined" :
  s === "CANCELLED" ? "cancelled" : "awaiting";

export const jobStatus = (s: JobState): WorkflowStatus =>
  s === "JOB_CREATED" ? "awaiting" :
  s === "SCHEDULE_PROPOSED" ? "awaiting" :
  s === "SCHEDULE_CONFIRMED" ? "scheduled" :
  s === "IN_PROGRESS" ? "in_progress" : "completed";

export const invoiceStatus = (s: InvoiceState): WorkflowStatus =>
  s === "PAID" ? "paid" : "unpaid";

export const companyStatus = (s: CompanyState): WorkflowStatus =>
  s === "PENDING" ? "awaiting" :
  s === "APPROVED" ? "approved" : "declined";