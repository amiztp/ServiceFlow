import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { JobTicketCard, EmptyState } from "../../components";
import { mockJobs, type Job, type JobState } from "../../mocks/data";

type Tab = "today" | "upcoming" | "history";

const jobStatus = (
  s: JobState
): "awaiting" | "scheduled" | "in_progress" | "completed" => {
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

const isSameDay = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

export default function EmployeeJobs() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("today");

  // Filter to only this employee's jobs
  const myJobs: Job[] = mockJobs.filter((j) => j.employeeId === "e1");

  const now = new Date();

  const todayJobs = myJobs.filter(
    (j) =>
      j.startTime &&
      isSameDay(j.startTime, now) &&
      (j.state === "SCHEDULE_CONFIRMED" ||
        j.state === "IN_PROGRESS" ||
        j.state === "COMPLETED")
  );

  const upcomingJobs = myJobs
    .filter(
      (j) =>
        j.state === "SCHEDULE_CONFIRMED" &&
        j.startTime &&
        new Date(j.startTime) > now &&
        !isSameDay(j.startTime, now)
    )
    .sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    );

  const historyJobs = myJobs
    .filter((j) => j.state === "COMPLETED")
    .sort(
      (a, b) =>
        new Date(b.startTime ?? 0).getTime() -
        new Date(a.startTime ?? 0).getTime()
    );

  const buckets: Record<Tab, Job[]> = {
    today: todayJobs,
    upcoming: upcomingJobs,
    history: historyJobs,
  };

  const counts: Record<Tab, number> = {
    today: todayJobs.length,
    upcoming: upcomingJobs.length,
    history: historyJobs.length,
  };

  const list = buckets[tab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sf-display text-2xl font-bold">My Day</h1>
        <p className="text-sm text-text-secondary mt-1">
          Your assigned jobs, grouped by when they happen.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {(["today", "upcoming", "history"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={active}
              className={`relative px-4 py-2 text-sm font-medium capitalize transition-colors ${
                active
                  ? "border-b-2 border-graphite text-graphite"
                  : "text-text-secondary hover:text-graphite"
              }`}
            >
              {t}
              {counts[t] > 0 && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-graphite text-white"
                      : "bg-paper text-text-secondary"
                  }`}
                >
                  {counts[t]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {list.length === 0 ? (
        <EmptyState
          title={`No ${tab} jobs`}
          description={
            tab === "today"
              ? "No jobs scheduled for today."
              : tab === "upcoming"
              ? "No upcoming jobs assigned yet."
              : "Completed jobs will appear here."
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((job) => (
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