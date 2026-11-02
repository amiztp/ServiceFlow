import { useState } from "react";
import {
  ActionButton,
  StatusBadge,
  JobTicketCard,
  SelectField,
  EmptyState,
} from "../../components";
import {
  mockJobs,
  mockEmployees,
  mockAvailableSlots,
  type Job,
  type JobState,
} from "../../mocks/data";

const jobStatus = (s: JobState): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatSlot = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ManagerJobs() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [error, setError] = useState<string | null>(null);

  const assign = (jobId: string, employeeId: string) => {
    const emp = mockEmployees.find((e) => e.id === employeeId);
    if (!emp) return;
    if (!emp.isActive) {
      setError(`${emp.fullName} is not active and cannot be assigned.`);
      return;
    }
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId ? { ...job, employeeId: emp.id, employeeName: emp.fullName } : job,
      ),
    );
    setError(null);
  };

  const proposeSlot = (jobId: string, start: string) => {
    const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId ? { ...job, startTime: start, endTime: end, state: "SCHEDULE_PROPOSED" } : job,
      ),
    );
    setError(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">Jobs & Scheduling</h1>

      {error && (
        <div className="rounded-docket border border-[#B93832] bg-[#FDF2F2] p-3 text-sm text-[#B93832]">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState title="No jobs yet" description="Approved quotations will become jobs here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobTicketCard
              key={job.id}
              id={job.id}
              title={job.serviceName}
              status={jobStatus(job.state)}
              client={job.clientName}
              schedule={
                job.startTime
                  ? formatSlot(job.startTime)
                  : job.state === "SCHEDULE_PROPOSED"
                    ? "Awaiting client approval"
                    : "Not scheduled"
              }
              employee={job.employeeName ?? "Unassigned"}
            >
              {job.state === "JOB_CREATED" && !job.employeeId && (
                <div className="space-y-2">
                  <p className="text-xs text-text-secondary">Step 1 — Assign an active employee</p>
                  <SelectField
                    label="Employee"
                    value=""
                    onChange={(e) => e.target.value && assign(job.id, e.target.value)}
                  >
                    <option value="">— Select employee —</option>
                    {mockEmployees
                      .filter((emp) => emp.isActive)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </option>
                      ))}
                  </SelectField>
                </div>
              )}

              {job.state === "JOB_CREATED" && job.employeeId && (
                <div className="space-y-2">
                  <p className="text-xs text-text-secondary">
                    Step 2 — Propose a 1-hour slot for {job.employeeName}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mockAvailableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => proposeSlot(job.id, slot)}
                        className="rounded-docket border border-line px-3 py-1.5 text-xs hover:bg-paper"
                      >
                        {formatSlot(slot)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary">
                    Availability is a hint — backend confirms reservations.
                  </p>
                </div>
              )}

              {job.state === "SCHEDULE_PROPOSED" && (
                <p className="text-sm text-[#6E5600]">
                  Slot proposed. Waiting for client to approve.
                </p>
              )}
            </JobTicketCard>
          ))}
        </div>
      )}
    </div>
  );
}
