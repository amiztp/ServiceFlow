import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionButton, JobTicketCard, Modal, TextAreaField } from "../../components";
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

export default function EmployeeJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const initialJob = mockJobs.find((job) => job.id === jobId);
  const [job, setJob] = useState<Job | undefined>(initialJob);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [notes, setNotes] = useState("");

  if (!job) {
    return <p className="p-6">Job not found</p>;
  }

  const now = new Date();
  const scheduled = job.startTime ? new Date(job.startTime) : null;
  const canStart = job.state === "SCHEDULE_CONFIRMED" && !!scheduled && now >= scheduled;
  const canComplete = job.state === "IN_PROGRESS";

  const start = () => {
    if (!canStart) {
      setError("You cannot start before the scheduled time.");
      return;
    }
    setJob({ ...job, state: "IN_PROGRESS" });
    setError(null);
  };

  const complete = () => {
    if (!canComplete) {
      setError("Start the job first.");
      return;
    }
    setJob({ ...job, state: "COMPLETED" });
    setCompleting(false);
    setError(null);
    setTimeout(() => navigate("/employee/jobs"), 800);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <ActionButton variant="ghost" onClick={() => navigate(-1)}>
        ← Back to jobs
      </ActionButton>

      <JobTicketCard
        id={job.id}
        title={job.serviceName}
        status={jobStatus(job.state)}
        client={job.clientName}
        schedule={formatSlot(job.startTime)}
        employee={job.employeeName ?? "Unassigned"}
      >
        {error && (
          <p className="mb-3 text-sm" style={{ color: "#B93832" }}>
            {error}
          </p>
        )}

        {job.state === "SCHEDULE_CONFIRMED" && (
          <ActionButton
            variant="stamp"
            onClick={start}
            disabled={!canStart}
            title={!canStart ? "Available at scheduled time" : "Start job"}
          >
            {canStart ? "Start job" : "Start (available at scheduled time)"}
          </ActionButton>
        )}

        {job.state === "IN_PROGRESS" && (
          <ActionButton variant="stamp" onClick={() => setCompleting(true)}>
            Complete job
          </ActionButton>
        )}

        {job.state === "COMPLETED" && (
          <p style={{ color: "var(--sf-success)" }}>
            Job completed. Invoice has been issued for the manager to record payment.
          </p>
        )}

        {job.state === "JOB_CREATED" && (
          <p className="text-sm text-text-secondary">
            Waiting for manager to schedule this job.
          </p>
        )}
      </JobTicketCard>

      <Modal
        open={completing}
        title="Complete this job?"
        description="This locks the job and creates an invoice. You cannot undo this."
        onClose={() => setCompleting(false)}
      >
        <div className="space-y-4">
          <TextAreaField
            label="Completion notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <ActionButton variant="stub" onClick={() => setCompleting(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="stamp" onClick={complete}>
              Complete job
            </ActionButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
