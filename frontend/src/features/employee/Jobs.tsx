import { useNavigate } from "react-router-dom";
import { JobTicketCard, EmptyState } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

const jobStatus = (s: JobState): "awaiting" | "scheduled" | "in_progress" | "completed" => {
  if (s === "JOB_CREATED") return "awaiting";
  if (s === "SCHEDULE_PROPOSED") return "awaiting";
  if (s === "SCHEDULE_CONFIRMED") return "scheduled";
  if (s === "IN_PROGRESS") return "in_progress";
  return "completed";
};

const formatSlot = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";

export default function EmployeeJobs() {
  const navigate = useNavigate();
  const myJobs: Job[] = mockJobs.filter((job) => job.employeeId === "e1");

  return (
    <div className="space-y-6">
      <h1 className="sf-display text-2xl font-bold">My Jobs</h1>

      {myJobs.length === 0 ? (
        <EmptyState title="No jobs assigned" description="Your assigned jobs will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/employee/jobs/${job.id}`)}
              style={{ cursor: "pointer" }}
            >
              <JobTicketCard
                id={job.id}
                title={job.serviceName}
                status={jobStatus(job.state)}
                client={job.clientName}
                schedule={formatSlot(job.startTime)}
                employee={job.employeeName ?? "Unassigned"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
